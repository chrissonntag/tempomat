import { Command, Flags } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, jsonFlag, applyGlobalFlags } from '../../commonFlags'

export default class Config extends Command {
    static description = 'show your settings; tokens are never printed'

    static examples = [
        `${appName} config`,
        `${appName} config:set work-type Entwicklung`,
        `${appName} config:unset work-type`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag
    }

    async run() {
        const { flags } = await this.parse(Config)
        applyGlobalFlags(flags)
        await tempo.showConfig()
    }
}
