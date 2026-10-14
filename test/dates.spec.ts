import { format } from 'date-fns'
import { parseDay, parseRange, rangeFromDates } from '../src/dates'

const wednesday = new Date(2026, 9, 14, 10, 30)
const day = (date: Date) => format(date, 'yyyy-MM-dd')

describe('parseDay', () => {
    test.each([
        ['y', '2026-10-13'],
        ['gestern', '2026-10-13'],
        ['t-2', '2026-10-12'],
        ['mon', '2026-10-12'],
        ['Montag', '2026-10-12'],
        ['wed', '2026-10-14'],
        ['fri', '2026-10-09'],
        ['fr', '2026-10-09'],
        ['last-fri', '2026-10-09'],
        ['last-mon', '2026-10-05'],
        ['letzten-mittwoch', '2026-10-07'],
        ['2026-02-17', '2026-02-17']
    ])('%p is %p', (input, expected) => {
        expect(day(parseDay(input, wednesday))).toBe(expected)
    })

    test('keeps the current time for today', () => {
        expect(parseDay('today', wednesday)).toEqual(wednesday)
        expect(parseDay(undefined, wednesday)).toEqual(wednesday)
    })

    test('rejects unknown input', () => {
        expect(() => parseDay('whenever', wednesday)).toThrow('Cannot parse "whenever" to a date.')
    })
})

describe('parseRange', () => {
    test.each([
        [undefined, '2026-10-12', '2026-10-18', 'Week 42/2026'],
        ['last', '2026-10-05', '2026-10-11', 'Week 41/2026'],
        ['-1', '2026-10-05', '2026-10-11', 'Week 41/2026'],
        ['-2', '2026-09-28', '2026-10-04', 'Week 40/2026'],
        ['41', '2026-10-05', '2026-10-11', 'Week 41/2026'],
        ['1', '2025-12-29', '2026-01-04', 'Week 1/2026'],
        ['53/2020', '2020-12-28', '2021-01-03', 'Week 53/2020'],
        ['2025-W41', '2025-10-06', '2025-10-12', 'Week 41/2025'],
        ['2026-W53', '2026-12-28', '2027-01-03', 'Week 53/2026']
    ])('week %p runs from %p to %p', (which, from, to, label) => {
        const range = parseRange('week', which, wednesday)

        expect(day(range.from)).toBe(from)
        expect(day(range.to)).toBe(to)
        expect(range.label).toContain(label)
    })

    test.each(['0', '54', 'soon', '2025-W53'])('rejects week %p', (which) => {
        expect(() => parseRange('week', which, wednesday)).toThrow()
    })

    test.each([
        [undefined, '2026-10-01', '2026-10-31'],
        ['last', '2026-09-01', '2026-09-30'],
        ['-2', '2026-08-01', '2026-08-31'],
        ['2026-02', '2026-02-01', '2026-02-28']
    ])('month %p runs from %p to %p', (which, from, to) => {
        const range = parseRange('month', which, wednesday)

        expect(day(range.from)).toBe(from)
        expect(day(range.to)).toBe(to)
    })

    test('builds a range from two days', () => {
        const range = rangeFromDates('mon', 'y', wednesday)

        expect(day(range.from)).toBe('2026-10-12')
        expect(day(range.to)).toBe('2026-10-13')
    })

    test('rejects a range that ends before it starts', () => {
        expect(() => rangeFromDates('2026-10-12', '2026-10-10', wednesday)).toThrow('is before')
    })
})
