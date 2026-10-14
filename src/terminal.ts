import { spawn } from 'child_process'
import { createInterface } from 'readline'
import { Readable, Writable } from 'stream'

export type PromptOptions = {
    hidden?: boolean;
    allowEmpty?: boolean;
    raw?: boolean;
}

export async function prompt(
    message: string,
    options: PromptOptions = {},
    input: Readable & { isTTY?: boolean } = process.stdin,
    output: Writable = process.stdout
): Promise<string> {
    let muted = false
    const mutableOutput = new Writable({
        write(chunk, encoding, callback) {
            if (!muted) output.write(chunk, encoding)
            callback()
        }
    })
    const rl = createInterface({ input, output: mutableOutput, terminal: Boolean(input.isTTY) })
    let rejectOnClose: () => void = () => undefined
    rl.on('close', () => rejectOnClose())
    try {
        let answer = ''
        for (let first = true; first || (!answer && !options.allowEmpty); first = false) {
            answer = await new Promise<string>((resolve, reject) => {
                rejectOnClose = () => reject(Error('Input closed before a value was entered'))
                rl.question(options.raw ? message : `${message}: `, resolve)
                muted = options.hidden === true
            })
            if (muted) output.write('\n')
            muted = false
            answer = answer.trim()
        }
        return answer
    } finally {
        rejectOnClose = () => undefined
        rl.close()
    }
}

export function openUrl(url: string) {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open'
    const child = spawn(command, [url], { detached: true, stdio: 'ignore' })
    child.on('error', () => undefined)
    child.unref()
}

export function isInteractive(): boolean {
    return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

export async function confirm(message: string, input?: Readable & { isTTY?: boolean }, output?: Writable): Promise<boolean> {
    const answer = await prompt(`${message} [y/N]`, { allowEmpty: true }, input, output)
    return ['y', 'yes', 'j', 'ja'].includes(answer.toLowerCase())
}

export async function choose(
    message: string,
    choices: string[],
    defaultIndex?: number,
    input?: Readable & { isTTY?: boolean },
    output?: Writable
): Promise<number> {
    const target: Writable = output ?? process.stdout
    choices.forEach((choice, index) => target.write(`  ${String(index + 1).padStart(2)}) ${choice}\n`))
    const hint = defaultIndex !== undefined ? ` [${defaultIndex + 1}]` : ''
    for (;;) {
        const answer = await prompt(`${message}${hint}`, { allowEmpty: defaultIndex !== undefined }, input, output)
        if (!answer && defaultIndex !== undefined) return defaultIndex
        const index = parseInt(answer) - 1
        if (/^\d+$/.test(answer) && index >= 0 && index < choices.length) return index
        target.write(`Enter a number between 1 and ${choices.length}.\n`)
    }
}
