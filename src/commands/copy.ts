import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../appName'
import tempo from '../tempo'
import { debugFlag, jsonFlag, dryRunFlag, applyGlobalFlags } from '../commonFlags'

export default class Copy extends Command {
    static description = '[or cp], log a copy of a worklog on another day, with the same issue, time, description and work type'

    static examples = [
        `${appName} copy 123456`,
        `${appName} cp 123456 y`,
        `${appName} cp 123456 2026-10-13 -s 9:30`
    ]

    static aliases = ['cp']

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag,
        'dry-run': dryRunFlag,
        start: Flags.string({ char: 's', description: 'start time (HH:mm) of the copy, defaults to the original start time' })
    }

    static args = {
        worklog_id: Args.string({ description: 'worklog id to copy, like 123456', required: true }),
        when: Args.string({ description: 'day of the copy, defaulted to today: YYYY-MM-DD, y, t-2, fri, last-fri', required: false })
    }

    async run() {
        const { args, flags } = await this.parse(Copy)
        applyGlobalFlags(flags)
        await tempo.copyWorklog(args.worklog_id, args.when, flags.start)
    }
}
