import configStore from './configStore'

export default {

    async getIssueKey(aliasName: string): Promise<string | undefined> {
        const config = await configStore.read()
        return config.aliases?.get(aliasName)
    },

    async getAliasNames(issueKey: string): Promise<Array<string>> {
        const config = await configStore.read()
        if (!config.aliases) return []
        const entries = Array.from(config.aliases.entries()).filter(entry => {
            return entry[1].toUpperCase() === issueKey.toUpperCase()
        })
        const aliases = entries.map(value => value[0])
        return aliases
    },

    async getWorkType(aliasName: string): Promise<string | undefined> {
        const config = await configStore.read()
        return config.aliasWorkTypes?.get(aliasName)
    },

    async set(aliasName: string, issueKey: string, workType?: string) {
        const config = await configStore.read()
        if (!config.aliases) {
            config.aliases = new Map<string, string>()
        }
        config.aliases.set(aliasName, issueKey)
        if (workType) {
            config.aliasWorkTypes ??= new Map<string, string>()
            config.aliasWorkTypes.set(aliasName, workType)
        } else {
            config.aliasWorkTypes?.delete(aliasName)
        }
        await configStore.save(config)
    },

    async delete(aliasName: string) {
        const config = await configStore.read()
        config.aliases?.delete(aliasName)
        config.aliasWorkTypes?.delete(aliasName)
        await configStore.save(config)
    },

    async all(): Promise<Map<string, string> | undefined> {
        const config = await configStore.read()
        return config.aliases
    }
}
