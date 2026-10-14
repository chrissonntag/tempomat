import { Command, Flags } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, applyGlobalFlags } from '../../commonFlags'

export default class Uninstall extends Command {
    static description = 'remove skill copies installed by tempomat; files you wrote yourself are never removed'

    static examples = [
        `${appName} skill:uninstall`,
        `${appName} skill:uninstall --dir ~/.claude/skills/tempo`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        dir: Flags.string({ description: 'remove only this installation' })
    }

    async run() {
        const { flags } = await this.parse(Uninstall)
        applyGlobalFlags(flags)
        await tempo.uninstallSkills(flags.dir)
    }
}
