import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, applyGlobalFlags } from '../../commonFlags'

export default class Unset extends Command {
    static description = 'remove a setting'

    static examples = [
        `${appName} config:unset work-type`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag
    }

    static args = {
        key: Args.string({ description: 'setting name', required: true, options: ['work-type'] })
    }

    async run() {
        const { args, flags } = await this.parse(Unset)
        applyGlobalFlags(flags)
        await tempo.unsetConfig(args.key)
    }
}
