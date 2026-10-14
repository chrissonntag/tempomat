import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, applyGlobalFlags } from '../../commonFlags'
import time from '../../time'

export default class Pause extends Command {
    static description = '[or pause], pause a tracker that is currently running'

    static examples = [
        `${appName} tracker:pause abc-123`,
        `${appName} pause abc-123`
    ]

    static aliases = ['pause']

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag
    }

    static args = {
        issue_key_or_alias: Args.string({
            description: 'issue key or alias',
            required: true
        })
    }

    async run() {
        const { args, flags } = await this.parse(Pause)
        applyGlobalFlags(flags)
        await tempo.pauseTracker({
            issueKeyOrAlias: args.issue_key_or_alias,
            now: time.now()
        })
    }
}
