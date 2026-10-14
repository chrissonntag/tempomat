import configStore, { Config } from './configStore'
import { platformSecretStore, SecretName, SecretStore } from './secrets'

export type Credentials = {
    tempoToken?: string;
    accountId?: string;
    atlassianUserEmail?: string;
    atlassianToken?: string;
    hostname?: string;
}

export type TokenStorage = 'file' | 'keychain'

let secretStoreFactory: (config: Config) => SecretStore & { blobs?: Partial<Record<SecretName, string>> } =
    config => platformSecretStore(config.secretBlobs ?? {})
let cachedSecrets: Partial<Record<SecretName, string>> | undefined

export default {

    async saveCredentials(credentials: Credentials, storage?: TokenStorage) {
        const config = await configStore.read()
        const target = storage ?? config.tokenStorage ?? 'file'
        const previousStorage = config.tokenStorage ?? 'file'
        config.accountId = credentials.accountId
        config.atlassianUserEmail = credentials.atlassianUserEmail
        config.hostname = credentials.hostname
        if (target === 'keychain') {
            const store = secretStoreFactory(config)
            await store.set('tempoToken', credentials.tempoToken ?? '')
            await store.set('atlassianToken', credentials.atlassianToken ?? '')
            if (store.blobs) config.secretBlobs = { ...store.blobs }
            delete config.tempoToken
            delete config.atlassianToken
        } else {
            config.tempoToken = credentials.tempoToken
            config.atlassianToken = credentials.atlassianToken
            if (previousStorage === 'keychain') {
                const store = secretStoreFactory(config)
                await store.delete('tempoToken')
                await store.delete('atlassianToken')
                delete config.secretBlobs
            }
        }
        config.tokenStorage = target
        await configStore.save(config)
        cachedSecrets = undefined
    },

    async getCredentials(): Promise<Credentials> {
        const config = await configStore.read()
        let tempoToken = config.tempoToken
        let atlassianToken = config.atlassianToken
        if (config.tokenStorage === 'keychain') {
            if (!cachedSecrets) {
                const store = secretStoreFactory(config)
                cachedSecrets = store.getAll
                    ? await store.getAll(['tempoToken', 'atlassianToken'])
                    : { tempoToken: await store.get('tempoToken'), atlassianToken: await store.get('atlassianToken') }
            }
            tempoToken = cachedSecrets.tempoToken
            atlassianToken = cachedSecrets.atlassianToken
        }
        return {
            tempoToken: tempoToken,
            accountId: config.accountId,
            atlassianUserEmail: config.atlassianUserEmail,
            atlassianToken: atlassianToken,
            hostname: config.hostname
        }
    },

    async keychainName(): Promise<string> {
        return secretStoreFactory(await configStore.read()).name
    },

    async keychainAvailable(): Promise<boolean> {
        try {
            return await secretStoreFactory(await configStore.read()).available()
        } catch {
            return false
        }
    },

    async hasTempoToken(): Promise<boolean> {
        try {
            const config = await configStore.read()
            return config.tempoToken !== undefined || config.tokenStorage === 'keychain'
        } catch {
            return false
        }
    },

    async hasAtlassianToken(): Promise<boolean> {
        try {
            const config = await configStore.read()
            return config.atlassianToken !== undefined || config.tokenStorage === 'keychain'
        } catch {
            return false
        }
    },

    useSecretStore(factory: typeof secretStoreFactory) {
        secretStoreFactory = factory
        cachedSecrets = undefined
    }
}
