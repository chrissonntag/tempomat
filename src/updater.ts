import axios from 'axios'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import * as tar from 'tar'
import { appVersion, packageRoot } from './version'

const GITHUB_API = 'https://api.github.com'
const ALLOWED_DOWNLOAD_HOSTS = ['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']

export type Release = {
    version: string
    tag: string
    url: string
    assets: { name: string, browser_download_url: string }[]
}

export type Installation = {
    dataRoot: string
    versionsDirectory: string
}

export function releasesRepository(): string {
    const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
    return manifest.tempomat.releases
}

export function compareVersions(a: string, b: string): number {
    const parse = (version: string) => version.replace(/^v/, '').split(/[.-]/).slice(0, 3).map(it => parseInt(it) || 0)
    const [left, right] = [parse(a), parse(b)]
    for (let i = 0; i < 3; i++) {
        if (left[i] !== right[i]) return left[i] - right[i]
    }
    return 0
}

export async function latestRelease(timeout = 10_000): Promise<Release> {
    const response = await axios.get(`${GITHUB_API}/repos/${releasesRepository()}/releases/latest`, {
        timeout,
        headers: {
            Accept: 'application/vnd.github+json',
            ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
        }
    })
    return {
        version: response.data.tag_name.replace(/^v/, ''),
        tag: response.data.tag_name,
        url: response.data.html_url,
        assets: response.data.assets
    }
}

export function managedInstallation(root = packageRoot): Installation | undefined {
    const resolved = fs.realpathSync(root)
    const versionDirectory = path.dirname(resolved)
    const versionsDirectory = path.dirname(versionDirectory)
    if (path.basename(resolved) !== 'tempo' || path.basename(versionsDirectory) !== 'versions') return undefined
    return { dataRoot: path.dirname(versionsDirectory), versionsDirectory }
}

export function platformTarget(): string {
    const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x64' : process.arch
    return `${process.platform}-${arch}`
}

export function findAsset(release: Release, target = platformTarget()): { tarball: string, checksums: string } {
    const escapedVersion = release.version.replace(/\./g, '\\.')
    const pattern = new RegExp(`^tempo-v${escapedVersion}-[0-9a-f]+-${target}\\.tar\\.gz$`)
    const tarball = release.assets.find(it => pattern.test(it.name))
    const checksums = release.assets.find(it => it.name === 'SHA256SUMS')
    if (!tarball) throw Error(`Release ${release.tag} has no build for ${target}.`)
    if (!checksums) throw Error(`Release ${release.tag} has no SHA256SUMS file, refusing to install it.`)
    return { tarball: tarball.browser_download_url, checksums: checksums.browser_download_url }
}

export function expectedChecksum(checksums: string, fileName: string): string {
    const line = checksums.split(/\r?\n/).find(it => it.trim().split(/\s+\*?/)[1] === fileName)
    const checksum = line?.trim().split(/\s+/)[0]
    if (!checksum || !/^[0-9a-f]{64}$/i.test(checksum)) throw Error(`SHA256SUMS has no checksum for ${fileName}.`)
    return checksum.toLowerCase()
}

export async function install(release: Release, installation: Installation, log: typeof console.log): Promise<string> {
    const { tarball, checksums } = findAsset(release)
    const fileName = decodeURIComponent(new URL(tarball).pathname.split('/').pop() as string)
    const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tempomat-update-'))
    try {
        log(`Downloading ${fileName}`)
        const archive = path.join(temp, fileName)
        await fs.promises.writeFile(archive, await download(tarball, 'arraybuffer'))
        const checksum = expectedChecksum(String(await download(checksums, 'text')), fileName)
        const actual = crypto.createHash('sha256').update(await fs.promises.readFile(archive)).digest('hex')
        if (actual !== checksum) throw Error(`Checksum mismatch for ${fileName}, refusing to install it.`)
        log('Checksum verified')

        const target = path.join(installation.versionsDirectory, release.version)
        const staging = `${target}.partial`
        await fs.promises.rm(staging, { recursive: true, force: true })
        await fs.promises.mkdir(staging, { recursive: true })
        await tar.x({ file: archive, cwd: staging })
        if (!fs.existsSync(path.join(staging, 'tempo', 'bin'))) throw Error('The downloaded archive has an unexpected layout.')
        await fs.promises.rm(target, { recursive: true, force: true })
        await fs.promises.rename(staging, target)
        await activate(installation, release.version)
        await pruneVersions(installation, release.version)
        return path.join(target, 'tempo')
    } finally {
        await fs.promises.rm(temp, { recursive: true, force: true })
    }
}

export function runNewVersion(newRoot: string, args: string[]) {
    const executable = process.platform === 'win32' ? path.join(newRoot, 'bin', 'tempo.cmd') : path.join(newRoot, 'bin', 'tempo')
    return spawnSync(executable, args, { stdio: 'inherit', shell: process.platform === 'win32' })
}

async function download(url: string, responseType: 'arraybuffer' | 'text') {
    const host = new URL(url).hostname
    if (new URL(url).protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.includes(host)) throw Error(`Refusing to download from ${url}.`)
    const response = await axios.get(url, {
        responseType,
        timeout: 120_000,
        maxRedirects: 5,
        beforeRedirect: (options: { hostname?: string, protocol?: string }) => {
            if (options.protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.includes(options.hostname ?? '')) {
                throw Error(`Refusing to follow a redirect to ${options.hostname}.`)
            }
        }
    })
    return responseType === 'arraybuffer' ? Buffer.from(response.data) : String(response.data)
}

async function activate(installation: Installation, version: string) {
    if (process.platform === 'win32') {
        const shim = path.join(installation.dataRoot, 'bin', 'tempo.cmd')
        await fs.promises.mkdir(path.dirname(shim), { recursive: true })
        await fs.promises.writeFile(shim, `@echo off\r\n"%~dp0..\\versions\\${version}\\tempo\\bin\\tempo.cmd" %*\r\n`)
        return
    }
    const current = path.join(installation.dataRoot, 'current')
    const temporary = `${current}.${process.pid}`
    await fs.promises.rm(temporary, { force: true })
    await fs.promises.symlink(path.join(installation.versionsDirectory, version, 'tempo'), temporary)
    await fs.promises.rename(temporary, current)
}

async function pruneVersions(installation: Installation, keepVersion: string) {
    const running = appVersion()
    for (const entry of await fs.promises.readdir(installation.versionsDirectory)) {
        if (entry !== keepVersion && entry !== running) {
            await fs.promises.rm(path.join(installation.versionsDirectory, entry), { recursive: true, force: true })
        }
    }
}
