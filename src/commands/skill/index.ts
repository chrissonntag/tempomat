import { Command, Flags } from '@oclif/core'
import { appName } from '../../appName'
import tempo from '../../tempo'
import { debugFlag, jsonFlag, applyGlobalFlags } from '../../commonFlags'

export default class Skill extends Command {
    static description = 'show where the tempo skill is installed and whether it is up to date'

    static examples = [`${appName} skill`]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag
    }

    async run() {
        const { flags } = await this.parse(Skill)
        applyGlobalFlags(flags)
        await tempo.showSkills()
    }
}
