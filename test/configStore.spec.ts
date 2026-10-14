import fs from 'fs'
import os from 'os'
import path from 'path'
import configStore from '../src/config/configStore'

let dir: string
let configPath: string

beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tempomat-'))
    configPath = path.join(dir, '.tempomat')
    process.env.TEMPOMAT_CONFIG = configPath
})

afterEach(() => {
    delete process.env.TEMPOMAT_CONFIG
    fs.rmSync(dir, { recursive: true, force: true })
})

describe('config store', () => {
    test('reads an empty config when the file does not exist', async () => {
        expect(await configStore.read()).toEqual({})
    })

    test('round-trips maps', async () => {
        await configStore.save({ tempoToken: 'token', aliases: new Map([['lunch', 'ABC-1']]) })

        const config = await configStore.read()

        expect(config.tempoToken).toBe('token')
        expect(config.aliases?.get('lunch')).toBe('ABC-1')
    })

    test('refuses a corrupted file and leaves it untouched', async () => {
        fs.writeFileSync(configPath, '{"tempoToken": "tok')

        await expect(configStore.read()).rejects.toThrow('is corrupted and was left untouched')

        expect(fs.readFileSync(configPath, 'utf8')).toBe('{"tempoToken": "tok')
    })

    if (process.platform !== 'win32') {
        test('tightens permissions of an existing world-readable file', async () => {
            fs.writeFileSync(configPath, '{}', { mode: 0o644 })
            fs.chmodSync(configPath, 0o644)

            await configStore.save({ tempoToken: 'token' })

            expect(fs.statSync(configPath).mode & 0o777).toBe(0o600)
        })
    }

    test('leaves no temporary files behind', async () => {
        await configStore.save({ tempoToken: 'token' })

        expect(fs.readdirSync(dir)).toEqual(['.tempomat'])
    })
})
