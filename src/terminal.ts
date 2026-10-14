import { spawn } from 'child_process'
import { createInterface } from 'readline'
import { Readable, Writable } from 'stream'

export type PromptOptions = {
    hidden?: boolean;
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
        while (!answer) {
            answer = await new Promise<string>((resolve, reject) => {
                rejectOnClose = () => reject(Error('Input closed before a value was entered'))
                rl.question(`${message}: `, resolve)
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
