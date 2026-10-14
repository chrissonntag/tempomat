import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../appName'
import { trimIndent } from '../trimIndent'
import tempo from '../tempo'
import * as timeParser from '../worklogs/timeParser'
import { workTypeFlag, debugFlag, jsonFlag, dryRunFlag, applyGlobalFlags } from '../commonFlags'

export default class Log extends Command {
    static description = '[or l], add a new worklog using duration or interval (abc-123 15m or abc-123 11-12:30)'

    static examples = [
        `${appName} log abc-123 1h `,
        `${appName} l abc-123 1h `,
        `${appName} log abc-123 15m `,
        `${appName} log abc-123 1h15m `,
        `${appName} log abc-123 11-14`,
        `${appName} log abc-123 11-14:30`,
        `${appName} log abc-123 11:35-14:20 `,
        `${appName} log abc-123 11.35-14.20 `,
        `${appName} log abc-123 1h15m 2019-02-17`,
        `${appName} log abc-123 1h15m y`,
        `${appName} log abc-123 1h15m yesterday`,
        `${appName} log abc-123 1h15m -d "worklog description"`,
        `${appName} log abc-123 1h15m --start 10:30`,
        `${appName} log abc-123 1h15m -s 9`,
        `${appName} log abc-123 1h15m -w Entwicklung`,
        `${appName} log abc-123 2h fri -s 9`,
        `${appName} log abc-123 1h --dry-run`,
        `${appName} log 1h`
    ]

    static aliases = ['l']

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag,
        'dry-run': dryRunFlag,
        description: Flags.string({ char: 'd', description: 'description for worklog' }),
        start: Flags.string({ char: 's', description: 'start time (HH:mm format), used when the input is a duration' }),
        'remaining-estimate': Flags.string({ char: 'r', description: 'remaining estimate' }),
        'work-type': workTypeFlag
    }

    static args = {
        issue_key_or_alias: Args.string({
            description: 'issue key or alias',
            required: true
        }),
        duration_or_interval: Args.string({
            description: 'worklog duration (e.g 15m) or interval (e.g 11:30-14); leave out the issue to pick one of your recent issues',
            required: false
        }),
        when: Args.string({
            description: trimIndent(`date to add worklog, defaulted to today
    * date in YYYY-MM-DD format, y, t-2
    * weekday like mon or fri (most recent), last-fri (previous week)`),
            required: false
        })
    }

    async run() {
        const { args, flags } = await this.parse(Log)
        applyGlobalFlags(flags)
        let issueKeyOrAlias: string | undefined = args.issue_key_or_alias
        let durationOrInterval = args.duration_or_interval
        let when = args.when
        if (looksLikeTime(issueKeyOrAlias) && (durationOrInterval === undefined || !looksLikeTime(durationOrInterval))) {
            when = durationOrInterval
            durationOrInterval = issueKeyOrAlias
            issueKeyOrAlias = undefined
        }
        if (durationOrInterval === undefined) this.error('Missing DURATION_OR_INTERVAL, e.g. tempo l ABC-123 1h.')
        await tempo.addWorklog({
            issueKeyOrAlias: issueKeyOrAlias,
            durationOrInterval: durationOrInterval,
            when: when,
            description: flags.description,
            startTime: flags.start,
            remainingEstimate: flags['remaining-estimate'],
            workType: flags['work-type']
        })
    }
}

function looksLikeTime(input: string): boolean {
    return timeParser.parse(input, new Date()) !== null
}
