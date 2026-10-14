import { Command, Flags } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, applyGlobalFlags } from '../../commonFlags'

export default class Update extends Command {
    static description = 'replace every skill copy installed by tempomat with the version bundled with this release'

    static examples = [`${appName} skill:update`]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag
    }

    async run() {
        const { flags } = await this.parse(Update)
        applyGlobalFlags(flags)
        await tempo.updateSkills()
    }
}
