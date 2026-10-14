import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../appName'
import { trimIndent } from '../trimIndent'
import tempo from '../tempo'
import { debugFlag, jsonFlag, applyGlobalFlags } from '../commonFlags'
import { parseRange, rangeFromDates } from '../dates'
import time from '../time'

const RANGE_UNITS = ['week', 'woche', 'month', 'monat']

export default class List extends Command {
    static description = '[or ls], print worklogs of a day, a week, a month or a date range'

    static examples = [
        `${appName} list`,
        `${appName} ls`,
        `${appName} ls y`,
        `${appName} ls fri`,
        `${appName} ls last-fri`,
        `${appName} ls 2020-02-17`,
        `${appName} ls -v`,
        `${appName} ls week`,
        `${appName} ls week last`,
        `${appName} ls week -2`,
        `${appName} ls week 41`,
        `${appName} ls week 2025-W41`,
        `${appName} ls month last`,
        `${appName} ls --from 2026-10-01 --to 2026-10-14`
    ]

    static aliases = ['ls']

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag,
        verbose: Flags.boolean({
            char: 'v',
            description: 'verbose output: work type, description and link per worklog; in week and month views every worklog'
        }),
        from: Flags.string({ description: 'first day of a date range', dependsOn: ['to'] }),
        to: Flags.string({ description: 'last day of a date range', dependsOn: ['from'] })
    }

    static args = {
        when: Args.string({
            description: trimIndent(`day, week or month to show, defaulted to today
    * date in YYYY-MM-DD format, y, t-2
    * weekday like mon or fri (most recent), last-fri (previous week)
    * week [last|-N|N|N/YYYY|YYYY-Www], ISO weeks starting on Monday
    * month [last|-N|YYYY-MM]`),
            required: false
        }),
        which: Args.string({
            description: 'which week or month, see WHEN',
            required: false
        })
    }

    async run() {
        const { args, flags } = await this.parse(List)
        applyGlobalFlags(flags)
        if (flags.from && flags.to) {
            const { from, to } = flags
            await tempo.listRange(() => rangeFromDates(from, to, time.now()), flags.verbose)
        } else if (args.when && RANGE_UNITS.includes(args.when.toLowerCase())) {
            const unit = args.when
            await tempo.listRange(() => parseRange(unit, args.which, time.now()), flags.verbose)
        } else {
            if (args.which) this.error(`Unexpected argument "${args.which}". Did you mean ${appName} ls week ${args.which}?`)
            await tempo.listUserWorklogs(args.when, flags.verbose)
        }
    }
}
