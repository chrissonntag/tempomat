import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../appName'
import tempo from '../tempo'
import { debugFlag, jsonFlag, dryRunFlag, yesFlag, applyGlobalFlags } from '../commonFlags'

export default class Delete extends Command {
    static description = '[or d], delete worklogs with the given ids after showing them and asking for confirmation'

    static examples = [
        `${appName} delete 123456`,
        `${appName} d 123456`,
        `${appName} delete 123456 123457`,
        `${appName} d 123456 -y`
    ]

    static aliases = ['d']

    static strict = false

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag,
        'dry-run': dryRunFlag,
        yes: yesFlag
    }

    static args = {
        worklog_id: Args.string({
            description: 'worklog ids to delete, like 123456',
            required: true
        })
    }

    async run() {
        const { argv, flags } = await this.parse(Delete)
        applyGlobalFlags(flags)
        await tempo.deleteWorklogs(argv as string[], flags.yes)
    }
}
