import { Command, Flags, Args } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, applyGlobalFlags } from '../../commonFlags'

export default class Set extends Command {
    static description = 'change a setting: work-type is used for every worklog logged without -w, token-storage moves your tokens between keychain and file'

    static examples = [
        `${appName} config:set work-type Entwicklung`,
        `${appName} config:set token-storage keychain`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag
    }

    static args = {
        key: Args.string({ description: 'setting name', required: true, options: ['work-type', 'token-storage'] }),
        value: Args.string({ description: 'new value', required: true })
    }

    async run() {
        const { args, flags } = await this.parse(Set)
        applyGlobalFlags(flags)
        await tempo.setConfig(args.key, args.value)
    }
}
