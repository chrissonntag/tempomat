import authenticator from '../src/config/authenticator'
import configStore from '../src/config/configStore'
import { macKeychain, RunResult, secretService, windowsDpapi, SecretName } from '../src/config/secrets'

jest.mock('../src/config/configStore', () => jest.requireActual('./mocks/configStore'))

const service = process.env.TEMPOMAT_KEYCHAIN_SERVICE || 'tempomat'

type Call = { command: string, args: string[], input?: string }

function fakeRunner(results: Partial<RunResult>[] = []) {
    const calls: Call[] = []
    const runner = async (command: string, args: string[], input?: string): Promise<RunResult> => {
        calls.push({ command, args, input })
        return { code: 0, stdout: '', stderr: '', ...(results.shift() ?? {}) }
    }
    return { calls, runner }
}

describe('secret stores never put a token on the command line', () => {
    test('macOS Keychain passes the token on stdin', async () => {
        const { calls, runner } = fakeRunner()

        await macKeychain(runner).set('tempoToken', 'se"cret')

        expect(calls[0].args).toEqual(['-i'])
        expect(calls[0].input).toBe(`add-generic-password -U -s ${service} -a tempoToken -w "se\\"cret"\n`)
    })

    test('Secret Service passes the token on stdin', async () => {
        const { calls, runner } = fakeRunner()

        await secretService(runner).set('atlassianToken', 'secret')

        expect(calls[0].args.join(' ')).not.toContain('secret ')
        expect(calls[0].args).toEqual(['store', '--label=tempomat atlassianToken', 'service', service, 'account', 'atlassianToken'])
        expect(calls[0].input).toBe('secret')
    })

    test('Windows Data Protection passes the token on stdin and keeps only the encrypted blob', async () => {
        const { calls, runner } = fakeRunner([{ stdout: 'BLOB==' }, { stdout: Buffer.from('secret').toString('base64') }])
        const store = windowsDpapi(runner)

        await store.set('tempoToken', 'secret')

        expect(calls[0].args.join(' ')).not.toContain('secret')
        expect(calls[0].input).toBe('secret')
        expect(store.blobs).toEqual({ tempoToken: 'BLOB==' })
        expect(await store.get('tempoToken')).toBe('secret')
        expect(calls[1].input).toBe('BLOB==')
    })

    test('Windows Data Protection decrypts all tokens in one PowerShell call', async () => {
        const encoded = (value: string) => Buffer.from(value).toString('base64')
        const { calls, runner } = fakeRunner([{ stdout: `${encoded('tempo, ä')},${encoded('atl')}` }])
        const store = windowsDpapi(runner, { tempoToken: 'BLOB1', atlassianToken: 'BLOB2' })

        expect(await store.getAll(['tempoToken', 'atlassianToken'])).toEqual({ tempoToken: 'tempo, ä', atlassianToken: 'atl' })
        expect(calls).toHaveLength(1)
        expect(calls[0].input).toBe('BLOB1,BLOB2')
    })

    test('Windows Data Protection fails when not every token could be decrypted', async () => {
        const { runner } = fakeRunner([{ stdout: 'dGVtcG8=' }])
        const store = windowsDpapi(runner, { tempoToken: 'BLOB1', atlassianToken: 'BLOB2' })

        await expect(store.getAll(['tempoToken', 'atlassianToken'])).rejects.toThrow('Could not decrypt tempoToken and atlassianToken')
    })

    test('Windows Data Protection does not start PowerShell when no token is stored', async () => {
        const { calls, runner } = fakeRunner()

        expect(await windowsDpapi(runner).getAll(['tempoToken'])).toEqual({})
        expect(calls).toHaveLength(0)
    })

    test('Secret Service is unavailable when the lookup reports an error', async () => {
        const { runner } = fakeRunner([{ code: 1, stderr: 'Cannot autolaunch D-Bus without X11 $DISPLAY' }])

        expect(await secretService(runner).available()).toBe(false)
    })
})

describe('token storage', () => {
    const memoryStore = () => {
        const values: Partial<Record<SecretName, string>> = {}
        return {
            values,
            store: {
                name: 'memory',
                available: async () => true,
                get: async (name: SecretName) => values[name],
                set: async (name: SecretName, value: string) => { values[name] = value },
                delete: async (name: SecretName) => { delete values[name] }
            }
        }
    }
    const credentials = { tempoToken: 'tempo', atlassianToken: 'atl', accountId: 'id', atlassianUserEmail: 'me@x.io', hostname: 'x.atlassian.net' }

    beforeEach(async () => {
        await configStore.save({})
    })

    test('keychain storage keeps tokens out of the config file', async () => {
        const memory = memoryStore()
        authenticator.useSecretStore(() => memory.store)

        await authenticator.saveCredentials(credentials, 'keychain')

        const config = await configStore.read()
        expect(config.tokenStorage).toBe('keychain')
        expect(config.tempoToken).toBeUndefined()
        expect(config.atlassianToken).toBeUndefined()
        expect(memory.values).toEqual({ tempoToken: 'tempo', atlassianToken: 'atl' })
        expect(await authenticator.getCredentials()).toEqual(credentials)
        expect(await authenticator.hasTempoToken()).toBe(true)
    })

    test('switching back to file storage removes the tokens from the keychain', async () => {
        const memory = memoryStore()
        authenticator.useSecretStore(() => memory.store)
        await authenticator.saveCredentials(credentials, 'keychain')

        await authenticator.saveCredentials(await authenticator.getCredentials(), 'file')

        expect(memory.values).toEqual({})
        expect(await configStore.read()).toMatchObject({ tokenStorage: 'file', tempoToken: 'tempo', atlassianToken: 'atl' })
    })
})
