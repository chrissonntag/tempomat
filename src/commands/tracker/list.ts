import { Command, Flags } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, jsonFlag, applyGlobalFlags } from '../../commonFlags'
import time from '../../time'

export default class List extends Command {
    static description = 'list all trackers'

    static examples = [
        `${appName} tracker:list`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag
    }

    async run() {
        const { flags } = await this.parse(List)
        applyGlobalFlags(flags)
        await tempo.listTrackers(time.now())
    }
}
