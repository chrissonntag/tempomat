import { AddWorklogInput } from './worklogs'

export type ImportLine = {
    lineNumber: number
    text: string
    input: AddWorklogInput
}

const FLAG_NAMES: Record<string, keyof AddWorklogInput> = {
    '-d': 'description',
    '--description': 'description',
    '-s': 'startTime',
    '--start': 'startTime',
    '-w': 'workType',
    '--work-type': 'workType',
    '-r': 'remainingEstimate',
    '--remaining-estimate': 'remainingEstimate'
}

export function parseImport(content: string): ImportLine[] {
    return content.split(/\r?\n/)
        .map((text, index) => ({ text: text.trim(), lineNumber: index + 1 }))
        .filter(line => line.text !== '' && !line.text.startsWith('#'))
        .map(line => ({ ...line, input: parseLine(line.text, line.lineNumber) }))
}

function parseLine(text: string, lineNumber: number): AddWorklogInput {
    const tokens = tokenize(text, lineNumber)
    if (tokens[0] === 'tempo') tokens.shift()
    if (tokens[0] === 'l' || tokens[0] === 'log') tokens.shift()
    const positional: string[] = []
    const flags: Partial<Record<keyof AddWorklogInput, string>> = {}
    for (let i = 0; i < tokens.length; i++) {
        const [name, inlineValue] = tokens[i].startsWith('--') ? tokens[i].split(/=(.*)/s, 2) : [tokens[i], undefined]
        const key = FLAG_NAMES[name]
        if (key) {
            const value = inlineValue ?? tokens[++i]
            if (value === undefined) throw Error(`Line ${lineNumber}: ${name} needs a value.`)
            flags[key] = value
        } else if (tokens[i].startsWith('-') && !/^-\d/.test(tokens[i])) {
            throw Error(`Line ${lineNumber}: unknown option ${tokens[i]}.`)
        } else {
            positional.push(tokens[i])
        }
    }
    if (positional.length < 2 || positional.length > 3) {
        throw Error(`Line ${lineNumber}: expected ISSUE DURATION_OR_INTERVAL [WHEN], got "${text}".`)
    }
    return {
        issueKeyOrAlias: positional[0],
        durationOrInterval: positional[1],
        when: positional[2],
        ...flags
    }
}

function tokenize(text: string, lineNumber: number): string[] {
    const tokens: string[] = []
    let current = ''
    let quote: string | undefined
    let inToken = false
    for (const char of text) {
        if (quote) {
            if (char === quote) quote = undefined
            else current += char
        } else if (char === '"' || char === '\'') {
            quote = char
            inToken = true
        } else if (/\s/.test(char)) {
            if (inToken) tokens.push(current)
            current = ''
            inToken = false
        } else {
            current += char
            inToken = true
        }
    }
    if (quote) throw Error(`Line ${lineNumber}: missing closing ${quote}.`)
    if (inToken) tokens.push(current)
    return tokens
}
