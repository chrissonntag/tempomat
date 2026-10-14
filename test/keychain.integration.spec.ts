import { platformSecretStore } from '../src/config/secrets'

const enabled = process.env.TEMPOMAT_KEYCHAIN_TEST === '1'

;(enabled ? describe : describe.skip)('real keychain', () => {
    test('stores, reads and deletes the tokens', async () => {
        const store = platformSecretStore({})
        expect(await store.available()).toBe(true)
        const value = `integration-${Date.now()}-"quoted", \\ value ä`

        await store.set('tempoToken', value)
        await store.set('atlassianToken', 'second')
        expect(await store.get('tempoToken')).toBe(value)
        if (store.getAll) expect(await store.getAll(['tempoToken', 'atlassianToken'])).toEqual({ tempoToken: value, atlassianToken: 'second' })

        await store.delete('tempoToken')
        await store.delete('atlassianToken')
        expect(await store.get('tempoToken')).toBeUndefined()
    }, 60_000)
})
