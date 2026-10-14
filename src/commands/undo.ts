import { Command, Flags } from '@oclif/core'
import { appName } from '../appName'
import tempo from '../tempo'
import { debugFlag, jsonFlag, dryRunFlag, yesFlag, applyGlobalFlags } from '../commonFlags'

export default class Undo extends Command {
    static description = 'undo your last log, copy, import, edit or delete'

    static examples = [
        `${appName} undo`,
        `${appName} undo --dry-run`,
        `${appName} undo -y`
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
        debug: debugFlag,
        json: jsonFlag,
        'dry-run': dryRunFlag,
        yes: yesFlag
    }

    async run() {
        const { flags } = await this.parse(Undo)
        applyGlobalFlags(flags)
        await tempo.undo(flags.yes)
    }
}
