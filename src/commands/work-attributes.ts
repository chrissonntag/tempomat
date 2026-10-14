import { Command, Flags } from '@oclif/core'
import { appName } from '../appName'
import tempo from '../tempo'
import globalFlags from '../globalFlags'

export default class WorkAttributes extends Command {
    static description = '[or wa], print the work attributes of the Tempo instance and their allowed values'

    static examples = [
        `${appName} work-attributes`,
        `${appName} wa`
    ]

    static aliases = ['wa']

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: Flags.boolean()
    }

    async run() {
        const { flags } = await this.parse(WorkAttributes)
        globalFlags.debug = flags.debug
        await tempo.listWorkAttributes()
    }
}
