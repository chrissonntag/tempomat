import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../appName'
import { trimIndent } from '../trimIndent'
import tempo from '../tempo'
import { debugFlag, jsonFlag, dryRunFlag, yesFlag, applyGlobalFlags } from '../commonFlags'

export default class Import extends Command {
    static description = trimIndent(`log many worklogs from a file or stdin, after checking all of them and showing a preview
    Write one worklog per line with the arguments of ${appName} log, e.g.:
      ABC-123 1h30m 2026-10-13 -s 9 -d "code review"
      ABC-124 13-17 mon -w Konzeption
    Empty lines and lines starting with # are ignored.`)

    static examples = [
        `${appName} import week.txt`,
        `${appName} import week.txt --dry-run`,
        `cat week.txt | ${appName} import - -y`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag,
        'dry-run': dryRunFlag,
        yes: yesFlag
    }

    static args = {
        file: Args.string({ description: 'file with one worklog per line, or - for stdin', required: true })
    }

    async run() {
        const { args, flags } = await this.parse(Import)
        applyGlobalFlags(flags)
        await tempo.importWorklogs(args.file, flags.yes)
    }
}
