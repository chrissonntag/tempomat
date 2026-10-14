import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, applyGlobalFlags } from '../../commonFlags'

export default class Set extends Command {
    static description = 'set issue key alias, then alias can be used instead of issue key'

    static examples = [
        `${appName} alias:set lunch abc-123`,
        `${appName} alias:set standup abc-124 -w Projektmanagement`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        'work-type': Flags.string({ char: 'w', description: 'work type used when logging with this alias, unless -w is given' })
    }

    static args = {
        alias: Args.string({
            description: 'alias name',
            required: true
        }),
        issue_key: Args.string({
            description: 'issue key',
            required: true
        })
    }

    async run() {
        const { args, flags } = await this.parse(Set)
        applyGlobalFlags(flags)
        await tempo.setAlias(args.alias, args.issue_key, flags['work-type'])
    }
}
