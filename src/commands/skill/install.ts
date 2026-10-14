import { Command, Flags } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, yesFlag, applyGlobalFlags } from '../../commonFlags'

export default class Install extends Command {
    static description = 'install the tempo skill for Claude Code, so you can manage your time with /tempo'

    static examples = [
        `${appName} skill:install`,
        `${appName} skill:install --user`,
        `${appName} skill:install --project`,
        `${appName} skill:install --dir ~/agents/skills`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        yes: yesFlag,
        user: Flags.boolean({ description: 'for all your projects (~/.claude/skills/tempo)', exclusive: ['project', 'dir'] }),
        project: Flags.boolean({ description: 'for the current project only (./.claude/skills/tempo)', exclusive: ['user', 'dir'] }),
        dir: Flags.string({ description: 'into another skills directory', exclusive: ['user', 'project'] })
    }

    async run() {
        const { flags } = await this.parse(Install)
        applyGlobalFlags(flags)
        const target = flags.user ? 'user' : flags.project ? 'project' : flags.dir ? { dir: flags.dir } : undefined
        await tempo.installSkill(target, flags.yes)
    }
}
