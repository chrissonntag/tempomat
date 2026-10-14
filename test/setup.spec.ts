import fs from 'fs'
import os from 'os'
import path from 'path'
import api from '../src/api/api'
import authenticator from '../src/config/authenticator'
import { SecretName } from '../src/config/secrets'
import configStore from '../src/config/configStore'
import * as terminal from '../src/terminal'
import { runSetup, extractHostname } from '../src/setup'

jest.mock('../src/config/configStore', () => jest.requireActual('./mocks/configStore'))
jest.mock('../src/terminal')

const mocked = terminal as jest.Mocked<typeof terminal>
const WORK_TYPES = [{
    key: '_WorkType_', name: 'Work Type', type: 'STATIC_LIST', required: true,
    values: ['uuid-pm', 'uuid-dev'], names: { 'uuid-pm': 'Projektmanagement', 'uuid-dev': 'Entwicklung' }
}]

let home: string
let answers: string[]
let keychain: { available: boolean, values: Partial<Record<SecretName, string>> }

beforeEach(async () => {
    jest.resetAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'tempomat-home-'))
    jest.spyOn(os, 'homedir').mockReturnValue(home)
    await configStore.save({})
    answers = []
    mocked.isInteractive.mockReturnValue(true)
    mocked.prompt.mockImplementation(async () => {
        if (answers.length === 0) throw Error('unexpected prompt')
        return answers.shift() as string
    })
    mocked.confirm.mockResolvedValue(true)
    api.verifyAtlassianCredentials = jest.fn().mockResolvedValue({ accountId: '712020:abc', displayName: 'Chris' })
    api.verifyTempoToken = jest.fn().mockResolvedValue(WORK_TYPES)
    keychain = { available: false, values: {} }
    authenticator.useSecretStore(() => ({
        name: 'test keychain',
        available: async () => keychain.available,
        get: async (name) => keychain.values[name],
        set: async (name, value) => { keychain.values[name] = value },
        delete: async (name) => { delete keychain.values[name] }
    }))
})

afterEach(() => {
    jest.restoreAllMocks()
    fs.rmSync(home, { recursive: true, force: true })
})

test('saves verified credentials, the account id from Jira and the chosen work type', async () => {
    answers = ['https://acme.atlassian.net/jira/your-work', 'me@acme.com', 'atl-token', 'tempo-token']
    mocked.choose.mockResolvedValueOnce(1).mockResolvedValueOnce(3)

    await runSetup()

    expect(api.verifyAtlassianCredentials).toHaveBeenCalledWith('acme.atlassian.net', 'me@acme.com', 'atl-token')
    expect(api.verifyTempoToken).toHaveBeenCalledWith('tempo-token')
    expect(await configStore.read()).toMatchObject({
        hostname: 'acme.atlassian.net',
        atlassianUserEmail: 'me@acme.com',
        atlassianToken: 'atl-token',
        tempoToken: 'tempo-token',
        accountId: '712020:abc',
        defaultWorkType: 'Entwicklung'
    })
    expect(mocked.prompt.mock.calls.filter(call => call[1]?.hidden)).toHaveLength(2)
})

test('asks again when Jira rejects the token, without saving anything before', async () => {
    answers = ['acme.atlassian.net', 'me@acme.com', 'wrong', '', '', 'right', 'tempo-token']
    ;(api.verifyAtlassianCredentials as jest.Mock)
        .mockRejectedValueOnce(Error('Unauthorized access.'))
        .mockResolvedValueOnce({ accountId: 'id', displayName: 'Chris' })
    mocked.choose.mockResolvedValueOnce(0).mockResolvedValueOnce(3)

    await runSetup()

    expect(api.verifyAtlassianCredentials).toHaveBeenLastCalledWith('acme.atlassian.net', 'me@acme.com', 'right')
    expect((await configStore.read()).atlassianToken).toBe('right')
})

test('keeps stored values when Enter is pressed', async () => {
    await configStore.save({
        hostname: 'acme.atlassian.net', atlassianUserEmail: 'me@acme.com', atlassianToken: 'old-atl',
        tempoToken: 'old-tempo', accountId: 'id', defaultWorkType: 'Entwicklung'
    })
    answers = ['', '', '', '']
    mocked.choose.mockImplementationOnce(async (message, choices, defaultIndex) => defaultIndex as number).mockResolvedValueOnce(3)

    await runSetup()

    expect(api.verifyAtlassianCredentials).toHaveBeenCalledWith('acme.atlassian.net', 'me@acme.com', 'old-atl')
    expect(api.verifyTempoToken).toHaveBeenCalledWith('old-tempo')
    expect(mocked.choose.mock.calls[0][2]).toBe(1)
    expect((await configStore.read()).defaultWorkType).toBe('Entwicklung')
})

test('asks before using a host outside atlassian.net', async () => {
    answers = ['jira.evil.example', 'acme.atlassian.net', 'me@acme.com', 'atl', 'tempo']
    mocked.confirm.mockResolvedValueOnce(false)
    mocked.choose.mockResolvedValueOnce(0).mockResolvedValueOnce(3)

    await runSetup()

    expect(mocked.confirm).toHaveBeenCalledWith('Use it anyway?')
    expect((await configStore.read()).hostname).toBe('acme.atlassian.net')
})

test('installs the skill for all projects when chosen', async () => {
    answers = ['acme.atlassian.net', 'me@acme.com', 'atl', 'tempo']
    mocked.choose.mockResolvedValueOnce(0).mockResolvedValueOnce(0)

    await runSetup()

    const skillFile = path.join(home, '.claude', 'skills', 'tempo', 'SKILL.md')
    expect(fs.readFileSync(skillFile, 'utf8')).toMatch(/^---\nname: tempo\n[\s\S]*<!-- Installed by tempomat \d+\.\d+\.\d+\./)
    expect((await configStore.read()).skillInstallations).toEqual([path.join(home, '.claude', 'skills', 'tempo')])
})

test('stores the tokens in the keychain when one is available and chosen', async () => {
    keychain.available = true
    answers = ['acme.atlassian.net', 'me@acme.com', 'atl', 'tempo']
    mocked.choose.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(3)

    await runSetup()

    expect(keychain.values).toEqual({ atlassianToken: 'atl', tempoToken: 'tempo' })
    const config = await configStore.read()
    expect(config.tokenStorage).toBe('keychain')
    expect(config.tempoToken).toBeUndefined()
    expect(config.atlassianToken).toBeUndefined()
})

test('refuses to run without a terminal', async () => {
    mocked.isInteractive.mockReturnValue(false)

    await expect(runSetup()).rejects.toThrow('needs an interactive terminal')
})

test.each([
    ['acme.atlassian.net', 'acme.atlassian.net'],
    ['https://acme.atlassian.net/jira/people/1', 'acme.atlassian.net'],
    [' http://acme.atlassian.net ', 'acme.atlassian.net']
])('extracts the host from %p', (input, expected) => {
    expect(extractHostname(input)).toBe(expected)
})

test.each(['', 'acme', 'https://'])('rejects %p as a host', (input) => {
    expect(() => extractHostname(input)).toThrow()
})
