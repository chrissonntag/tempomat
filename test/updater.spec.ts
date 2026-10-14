import axios from 'axios'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import * as tar from 'tar'
import { compareVersions, expectedChecksum, findAsset, install, managedInstallation, Release } from '../src/updater'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

let root: string

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'tempomat-update-'))
})

afterEach(() => {
    jest.resetAllMocks()
    fs.rmSync(root, { recursive: true, force: true })
})

const target = `${process.platform}-${process.arch}`

function release(version: string, assets: string[]): Release {
    return {
        version,
        tag: `v${version}`,
        url: `https://github.com/chrissonntag/tempomat/releases/tag/v${version}`,
        assets: assets.map(name => ({ name, browser_download_url: `https://github.com/chrissonntag/tempomat/releases/download/v${version}/${name}` }))
    }
}

async function buildArchive(version: string): Promise<{ name: string, content: Buffer }> {
    const source = path.join(root, 'source')
    fs.mkdirSync(path.join(source, 'tempo', 'bin'), { recursive: true })
    fs.writeFileSync(path.join(source, 'tempo', 'bin', 'tempo'), `#!/bin/sh\necho ${version}\n`)
    const name = `tempo-v${version}-abc1234-${target}.tar.gz`
    const file = path.join(root, name)
    await tar.c({ gzip: true, file, cwd: source }, ['tempo'])
    fs.rmSync(source, { recursive: true })
    return { name, content: fs.readFileSync(file) }
}

function serve(files: Record<string, Buffer | string>) {
    mockedAxios.get.mockImplementation(async (url: string) => {
        const name = url.split('/').pop() as string
        if (!(name in files)) throw Error(`unexpected download ${url}`)
        return { data: files[name] }
    })
}

describe('versions', () => {
    test.each([
        ['2.1.0', '2.0.9', 1],
        ['v2.10.0', '2.9.0', 1],
        ['2.0.1', '2.0.1', 0],
        ['1.9.9', '2.0.0', -1]
    ])('%p compared to %p', (a, b, sign) => {
        expect(Math.sign(compareVersions(a, b))).toBe(sign)
    })
})

describe('assets', () => {
    test('picks the build for this platform and the checksum file', () => {
        const found = findAsset(release('2.1.0', ['tempo-v2.1.0-abc1234-linux-x64.tar.gz', 'tempo-v2.1.0-abc1234-darwin-arm64.tar.gz', 'SHA256SUMS']), 'darwin-arm64')

        expect(found.tarball).toMatch(/darwin-arm64\.tar\.gz$/)
        expect(found.checksums).toMatch(/SHA256SUMS$/)
    })

    test('refuses a release without checksums', () => {
        expect(() => findAsset(release('2.1.0', ['tempo-v2.1.0-abc1234-linux-x64.tar.gz']), 'linux-x64')).toThrow('no SHA256SUMS')
    })

    test('reads checksums in sha256sum format', () => {
        const sum = 'a'.repeat(64)
        expect(expectedChecksum(`${'b'.repeat(64)}  other.tar.gz\n${sum}  tempo.tar.gz\n`, 'tempo.tar.gz')).toBe(sum)
        expect(() => expectedChecksum(`${sum}  other.tar.gz`, 'tempo.tar.gz')).toThrow('no checksum')
    })
})

describe('managed installation', () => {
    test('is recognized by its versions/<version>/tempo layout', () => {
        const installed = path.join(root, 'tempomat', 'versions', '2.0.1', 'tempo')
        fs.mkdirSync(installed, { recursive: true })

        expect(managedInstallation(installed)).toEqual({
            dataRoot: fs.realpathSync(path.join(root, 'tempomat')),
            versionsDirectory: fs.realpathSync(path.join(root, 'tempomat', 'versions'))
        })
        expect(managedInstallation(root)).toBeUndefined()
    })
})

describe('install', () => {
    const installation = () => {
        const dataRoot = path.join(root, 'tempomat')
        fs.mkdirSync(path.join(dataRoot, 'versions', '1.0.0', 'tempo'), { recursive: true })
        return { dataRoot, versionsDirectory: path.join(dataRoot, 'versions') }
    }

    test('verifies, extracts and activates the new version and removes old ones', async () => {
        const target = installation()
        const archive = await buildArchive('2.1.0')
        const sum = crypto.createHash('sha256').update(archive.content).digest('hex')
        serve({ [archive.name]: archive.content, SHA256SUMS: `${sum}  ${archive.name}\n` })

        const newRoot = await install(release('2.1.0', [archive.name, 'SHA256SUMS']), target, () => undefined)

        expect(newRoot).toBe(path.join(target.versionsDirectory, '2.1.0', 'tempo'))
        expect(fs.readFileSync(path.join(newRoot, 'bin', 'tempo'), 'utf8')).toContain('2.1.0')
        expect(fs.readdirSync(target.versionsDirectory)).toEqual(['2.1.0'])
        if (process.platform === 'win32') {
            expect(fs.readFileSync(path.join(target.dataRoot, 'bin', 'tempo.cmd'), 'utf8')).toContain('versions\\2.1.0\\tempo')
        } else {
            expect(fs.readlinkSync(path.join(target.dataRoot, 'current'))).toBe(newRoot)
        }
    })

    test('refuses an archive whose checksum does not match and changes nothing', async () => {
        const target = installation()
        const archive = await buildArchive('2.1.0')
        serve({ [archive.name]: archive.content, SHA256SUMS: `${'0'.repeat(64)}  ${archive.name}\n` })

        await expect(install(release('2.1.0', [archive.name, 'SHA256SUMS']), target, () => undefined)).rejects.toThrow('Checksum mismatch')

        expect(fs.readdirSync(target.versionsDirectory)).toEqual(['1.0.0'])
        expect(fs.existsSync(path.join(target.dataRoot, 'current'))).toBe(false)
    })

    test('refuses downloads from other hosts', async () => {
        const target = installation()
        const evil = release('2.1.0', [`tempo-v2.1.0-abc1234-${process.platform}-${process.arch}.tar.gz`, 'SHA256SUMS'])
        evil.assets[0].browser_download_url = 'https://evil.example/tempo.tar.gz'

        await expect(install(evil, target, () => undefined)).rejects.toThrow('Refusing to download from https://evil.example/tempo.tar.gz')

        expect(mockedAxios.get).not.toHaveBeenCalled()
    })
})
