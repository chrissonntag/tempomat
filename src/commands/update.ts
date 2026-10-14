import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { appName } from '../appName'
import { debugFlag, yesFlag, applyGlobalFlags } from '../commonFlags'
import { compareVersions, install, latestRelease, managedInstallation, runNewVersion } from '../updater'
import { updateInstallations } from '../skill'
import { confirm, isInteractive } from '../terminal'
import { showError } from '../output'

export default class Update extends Command {
    static description = 'update tempomat to the latest release, together with every skill copy it installed'

    static examples = [
        `${appName} update`,
        `${appName} update --check`,
        `${appName} update -y`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        yes: yesFlag,
        check: Flags.boolean({ description: 'only tell whether a newer release exists' }),
        force: Flags.boolean({ description: 'reinstall the latest release even if it is not newer' })
    }

    async run() {
        const { flags } = await this.parse(Update)
        applyGlobalFlags(flags)
        try {
            await this.update(flags)
        } catch (e) {
            showError(e as Error)
        }
    }

    private async update(flags: { check: boolean, force: boolean, yes: boolean }) {
        const current = this.config.version
        const release = await latestRelease()
        const newer = compareVersions(release.version, current) > 0
        if (!newer && !flags.force) {
            this.log(`tempomat ${current} is the latest release.`)
            await this.refreshSkills()
            return
        }
        this.log(newer ? `tempomat ${release.version} is available, you have ${current}. Changes: ${release.url}` : `Reinstalling ${release.version}.`)
        if (flags.check) return

        const installation = managedInstallation(this.config.root)
        if (!installation) {
            this.log(chalk.yellow(`This copy runs from ${this.config.root}, which the installer did not create.`))
            this.log('Update it the way you installed it, for example: git pull && npm ci && npm run build')
            this.log(`Then run ${chalk.bold(`${appName} skill:update`)} to update the skill.`)
            return
        }
        if (!flags.yes && isInteractive() && !await confirm(`Install ${release.version}?`)) {
            this.log('Cancelled.')
            return
        }
        const newRoot = await install(release, installation, message => this.log(message))
        this.log(chalk.greenBright(`Installed tempomat ${release.version}.`))
        const result = runNewVersion(newRoot, ['skill:update'])
        if (result.status !== 0) this.warn(`Updating the skill failed. Run ${appName} skill:update yourself.`)
    }

    private async refreshSkills() {
        const result = await updateInstallations()
        result.updated.forEach(directory => this.log(`Skill up to date: ${directory}`))
    }
}
