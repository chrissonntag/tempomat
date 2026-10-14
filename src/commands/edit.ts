import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../appName'
import tempo from '../tempo'
import { workTypeFlag, debugFlag, jsonFlag, dryRunFlag, applyGlobalFlags } from '../commonFlags'

export default class Edit extends Command {
    static description = '[or e], change a worklog in place: time, start, day, description, work type or issue'

    static examples = [
        `${appName} edit 123456 -t 2h`,
        `${appName} e 123456 -t 9-11:30`,
        `${appName} edit 123456 --start 9:30`,
        `${appName} edit 123456 --date y`,
        `${appName} edit 123456 -d "new description" -w Konzeption`,
        `${appName} edit 123456 --issue abc-124`,
        `${appName} edit 123456 -t 3h --dry-run`
    ]

    static aliases = ['e']

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag,
        'dry-run': dryRunFlag,
        time: Flags.string({ char: 't', description: 'new duration (e.g. 1h15m) or interval (e.g. 9-11:30)' }),
        start: Flags.string({ char: 's', description: 'new start time (HH:mm), keeps the duration' }),
        date: Flags.string({ description: 'move to another day: YYYY-MM-DD, y, t-2, fri, last-fri' }),
        description: Flags.string({ char: 'd', description: 'new description' }),
        'work-type': workTypeFlag,
        issue: Flags.string({ char: 'i', description: 'move to another issue key or alias; the worklog gets a new id' }),
        'remaining-estimate': Flags.string({ char: 'r', description: 'new remaining estimate of the issue' })
    }

    static args = {
        worklog_id: Args.string({ description: 'worklog id, like 123456', required: true })
    }

    async run() {
        const { args, flags } = await this.parse(Edit)
        applyGlobalFlags(flags)
        const changes = [flags.time, flags.start, flags.date, flags.description, flags['work-type'], flags.issue, flags['remaining-estimate']]
        if (changes.every(it => it === undefined)) {
            this.error('Nothing to change. Pass at least one of --time, --start, --date, --description, --work-type, --issue.')
        }
        await tempo.editWorklog({
            worklogId: args.worklog_id,
            durationOrInterval: flags.time,
            startTime: flags.start,
            when: flags.date,
            description: flags.description,
            workType: flags['work-type'],
            issueKeyOrAlias: flags.issue,
            remainingEstimate: flags['remaining-estimate']
        })
    }
}
