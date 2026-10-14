import { Flags } from '@oclif/core'
import globalFlags from './globalFlags'

export const debugFlag = Flags.boolean({ description: 'print requests and responses without credentials' })
export const jsonFlag = Flags.boolean({ description: 'print machine-readable JSON instead of tables' })
export const dryRunFlag = Flags.boolean({ description: 'show what would be sent to Tempo without changing anything' })
export const yesFlag = Flags.boolean({ char: 'y', description: 'do not ask for confirmation' })
export const workTypeFlag = Flags.string({ char: 'w', description: 'work type name, e.g. Entwicklung (see tempo work-attributes); defaults to tempo config work-type' })

export function applyGlobalFlags(flags: { debug?: boolean, json?: boolean, 'dry-run'?: boolean }) {
    globalFlags.debug = flags.debug ?? false
    globalFlags.json = flags.json ?? false
    globalFlags.dryRun = flags['dry-run'] ?? false
}
