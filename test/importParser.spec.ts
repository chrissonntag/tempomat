import { parseImport } from '../src/worklogs/importParser'

describe('import parser', () => {
    test('reads one worklog per line and skips comments and blank lines', () => {
        const lines = parseImport([
            '# Monday',
            'ABC-123 1h30m 2026-10-12 -s 9 -d "code review"',
            '',
            'abc-124 13-17 mon -w Konzeption --remaining-estimate=2h'
        ].join('\n'))

        expect(lines.map(it => it.lineNumber)).toEqual([2, 4])
        expect(lines[0].input).toEqual({
            issueKeyOrAlias: 'ABC-123',
            durationOrInterval: '1h30m',
            when: '2026-10-12',
            startTime: '9',
            description: 'code review'
        })
        expect(lines[1].input).toEqual({
            issueKeyOrAlias: 'abc-124',
            durationOrInterval: '13-17',
            when: 'mon',
            workType: 'Konzeption',
            remainingEstimate: '2h'
        })
    })

    test('accepts pasted tempo log commands and single quotes', () => {
        const [line] = parseImport("tempo l ABC-1 15m t-1 -d 'it''s fine'")

        expect(line.input).toMatchObject({ issueKeyOrAlias: 'ABC-1', when: 't-1', description: 'its fine' })
    })

    test('keeps an empty description', () => {
        const [line] = parseImport('ABC-1 15m -d ""')

        expect(line.input.description).toBe('')
    })

    test.each([
        ['ABC-1', 'Line 1: expected ISSUE DURATION_OR_INTERVAL [WHEN]'],
        ['ABC-1 1h y extra', 'Line 1: expected ISSUE DURATION_OR_INTERVAL [WHEN]'],
        ['ABC-1 1h -x', 'Line 1: unknown option -x.'],
        ['ABC-1 1h -d', 'Line 1: -d needs a value.'],
        ['ABC-1 1h -d "open', 'Line 1: missing closing ".']
    ])('rejects %p', (text, message) => {
        expect(() => parseImport(text)).toThrow(message)
    })
})
