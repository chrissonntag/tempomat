import { Hook } from '@oclif/core'
import chalk from 'chalk'
import configStore from '../../config/configStore'
import { compareVersions, latestRelease } from '../../updater'
import { listInstallations, updateInstallations } from '../../skill'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const SKIPPED_COMMANDS = ['update', 'setup', 'skill:update', 'skill:install', 'skill:uninstall']

const hook: Hook<'init'> = async function (options) {
    if (process.env.TEMPOMAT_NO_UPDATE_CHECK || SKIPPED_COMMANDS.includes(options.id ?? '') || options.argv.includes('--json')) return
    try {
        await refreshOutdatedSkills(options.config.version)
        if (process.stderr.isTTY) await notifyAboutRelease(options.config.version)
    } catch {
        return
    }
}

async function refreshOutdatedSkills(version: string) {
    const installations = await listInstallations()
    if (!installations.some(it => it.exists && it.installedVersion && it.installedVersion !== version)) return
    const result = await updateInstallations()
    if (result.updated.length > 0 && process.stderr.isTTY) {
        process.stderr.write(chalk.gray(`Updated the tempo skill to ${version}.\n`))
    }
}

async function notifyAboutRelease(version: string) {
    const config = await configStore.read()
    let latest = config.updateCheck?.latestVersion
    if (!config.updateCheck || Date.now() - config.updateCheck.checkedAt > CHECK_INTERVAL_MS) {
        latest = await latestRelease(1500).then(release => release.version, () => latest)
        const fresh = await configStore.read()
        fresh.updateCheck = { checkedAt: Date.now(), latestVersion: latest }
        await configStore.save(fresh)
    }
    if (latest && compareVersions(latest, version) > 0) {
        process.stderr.write(chalk.yellow(`tempomat ${latest} is available, you have ${version}. Run tempo update.\n`))
    }
}

export default hook
