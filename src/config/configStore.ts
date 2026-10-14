import fs from 'fs'
import os from 'os'
import path from 'path'
import { Tracker } from './trackerStore'
import { WorkAttributeValue } from '../api/api'

export type LastAction =
    | { type: 'log', worklogIds: string[] }
    | { type: 'delete', worklog: WorklogSnapshot }
    | { type: 'edit', worklogId: string, previous: WorklogSnapshot }
    | { type: 'move', worklogId: string, previous: WorklogSnapshot }

export type WorklogSnapshot = {
    issueId: string
    timeSpentSeconds: number
    startDate: string
    startTime: string
    description?: string
    attributes?: WorkAttributeValue[]
}

export type Config = {
    tempoToken?: string
    accountId?: string
    atlassianUserEmail?: string
    atlassianToken?: string
    hostname?: string
    tokenStorage?: 'file' | 'keychain'
    secretBlobs?: { tempoToken?: string, atlassianToken?: string }
    defaultWorkType?: string
    aliases?: Map<string, string>
    aliasWorkTypes?: Map<string, string>
    trackers?: Map<string, Tracker>
    skillInstallations?: string[]
    lastAction?: LastAction
    updateCheck?: { checkedAt: number, latestVersion?: string }
}

export function configFilePath(): string {
    return process.env.TEMPOMAT_CONFIG || path.join(os.homedir(), '.tempomat')
}

export default {

    async save(config: Config) {
        const configPath = configFilePath()
        const tempPath = `${configPath}.${process.pid}.tmp`
        try {
            await fs.promises.writeFile(tempPath, JSON.stringify(config, replacer), { mode: 0o600 })
            await fs.promises.chmod(tempPath, 0o600)
            await fs.promises.rename(tempPath, configPath)
        } catch (e) {
            await fs.promises.rm(tempPath, { force: true })
            throw e
        }
    },

    async read(): Promise<Config> {
        const configPath = configFilePath()
        let configJson: string
        try {
            configJson = await fs.promises.readFile(configPath, { encoding: 'utf8' })
        } catch (e) {
            if ((e as { code?: string }).code === 'ENOENT') return {}
            throw Error(`Cannot read ${configPath}: ${(e as Error).message}`)
        }
        try {
            return JSON.parse(configJson, reviver)
        } catch {
            throw Error(`${configPath} is corrupted and was left untouched. Repair or remove it, then run tempo setup.`)
        }
    }
}

function replacer(this: any, key: any, value: any) {
    const originalObject = this[key]
    if (originalObject instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(originalObject.entries())
        }
    } else {
        return value
    }
}

function reviver(key: any, value: any) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value)
        }
    }
    return value
}
