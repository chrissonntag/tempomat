import { platformSecretStore } from '../src/config/secrets'

const enabled = process.env.TEMPOMAT_KEYCHAIN_TEST === '1'

;(enabled ? describe : describe.skip)('real keychain', () => {
    test('stores, reads and deletes a token', async () => {
        const store = platformSecretStore({})
        expect(await store.available()).toBe(true)
        const value = `integration-${Date.now()}-"quoted" \\ value`

        await store.set('tempoToken', value)
        expect(await store.get('tempoToken')).toBe(value)

        await store.delete('tempoToken')
        expect(await store.get('tempoToken')).toBeUndefined()
    })
})
