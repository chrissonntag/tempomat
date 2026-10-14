import { ux } from '@oclif/core'
import chalk from 'chalk'
import globalFlags from './globalFlags'

export function printJson(value: unknown) {
    console.log(JSON.stringify(value, null, 2))
}

export function startProgress(message: string) {
    if (!globalFlags.json) ux.action.start(message)
}

export function stopProgress(message: string) {
    if (!globalFlags.json && ux.action.running) ux.action.stop(message)
}

export function showError(e: Error) {
    stopProgress('Error.')
    process.exitCode = 1
    if (globalFlags.json) {
        printJson({ error: e.message })
    } else {
        console.log(chalk.redBright(e.message))
    }
}

export function info(message: string) {
    if (!globalFlags.json) console.log(message)
}

export function warn(message: string) {
    if (!globalFlags.json) console.log(chalk.yellow(message))
}
