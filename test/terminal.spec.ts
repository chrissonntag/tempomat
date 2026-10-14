import { PassThrough } from 'stream'
import { prompt } from '../src/terminal'

function fakeTerminal() {
    const input = Object.assign(new PassThrough(), { isTTY: true })
    const output = new PassThrough()
    let written = ''
    output.on('data', (chunk) => { written += chunk.toString() })
    return { input, output, written: () => written }
}

describe('prompt', () => {
    test('echoes visible input', async () => {
        const terminal = fakeTerminal()

        const answer = prompt('Enter your email', {}, terminal.input, terminal.output)
        terminal.input.write('me@example.com\r')

        expect(await answer).toBe('me@example.com')
        expect(terminal.written()).toContain('Enter your email: ')
        expect(terminal.written()).toContain('me@example.com')
    })

    test('does not echo hidden input', async () => {
        const terminal = fakeTerminal()

        const answer = prompt('Enter your token', { hidden: true }, terminal.input, terminal.output)
        terminal.input.write('secret-token\r')

        expect(await answer).toBe('secret-token')
        expect(terminal.written()).toContain('Enter your token: ')
        expect(terminal.written()).not.toContain('secret')
    })

    test('does not echo hidden input after an earlier prompt', async () => {
        const terminal = fakeTerminal()

        const email = prompt('Enter your email', {}, terminal.input, terminal.output)
        terminal.input.write('me@example.com\r')
        expect(await email).toBe('me@example.com')
        const token = prompt('Enter your token', { hidden: true }, terminal.input, terminal.output)
        terminal.input.write('secret-token\r')

        expect(await token).toBe('secret-token')
        expect(terminal.written().match(/me@example\.com/g)).toHaveLength(1)
        expect(terminal.written().split('Enter your token: ')[1]).not.toMatch(/[a-z]/)
    })

    test('asks again until a value is entered', async () => {
        const terminal = fakeTerminal()

        const answer = prompt('Enter your token', { hidden: true }, terminal.input, terminal.output)
        terminal.input.write('  \r')
        await new Promise(setImmediate)
        terminal.input.write('secret-token\r')

        expect(await answer).toBe('secret-token')
        expect(terminal.written().match(/Enter your token: /g)).toHaveLength(2)
    })

    test('fails when input ends without a value', async () => {
        const terminal = fakeTerminal()

        const answer = prompt('Enter your token', { hidden: true }, terminal.input, terminal.output)
        terminal.input.end()

        await expect(answer).rejects.toThrow('Input closed before a value was entered')
    })
})
