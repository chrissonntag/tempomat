import {
    addDays, addMonths, addWeeks, endOfISOWeek, endOfMonth, format, getISOWeek, getISOWeekYear,
    isValid, parse as fnsParse, setISOWeek, setISOWeekYear, startOfDay, startOfISOWeek, startOfMonth
} from 'date-fns'
import { appName } from './appName'

export const DATE_FORMAT = 'yyyy-MM-dd'

export type DateRange = {
    from: Date
    to: Date
    label: string
}

const YESTERDAY_LITERALS = ['y', 'yesterday', 'gestern']
const TODAY_LITERALS = ['t', 'today', 'heute']
const TODAY_REFERENCE_REGEX = RegExp(`^(${TODAY_LITERALS.join('|')})[-+][0-9]+$`)
const WEEKDAYS: Record<string, number> = {
    sun: 0, sunday: 0, so: 0, sonntag: 0,
    mon: 1, monday: 1, mo: 1, montag: 1,
    tue: 2, tuesday: 2, tu: 2, di: 2, dienstag: 2,
    wed: 3, wednesday: 3, we: 3, mi: 3, mittwoch: 3,
    thu: 4, thursday: 4, th: 4, do: 4, donnerstag: 4,
    fri: 5, friday: 5, fr: 5, freitag: 5,
    sat: 6, saturday: 6, sa: 6, samstag: 6
}
const LAST_LITERALS = ['last', 'prev', 'previous', 'letzte', 'letzten', 'vorige']

export function parseDay(when: string | undefined, now: Date): Date {
    if (when === undefined) return now
    const input = when.trim().toLowerCase()
    const today = startOfDay(now)
    if (TODAY_LITERALS.includes(input)) return now
    if (YESTERDAY_LITERALS.includes(input)) return addDays(today, -1)
    if (input.match(TODAY_REFERENCE_REGEX)) return addDays(today, parseInt(input.replace(/[^\d+-]/g, '')))

    const lastWeekday = input.match(/^([a-zäöü]+)-([a-z]+)$/)
    if (lastWeekday && LAST_LITERALS.includes(lastWeekday[1]) && lastWeekday[2] in WEEKDAYS) {
        return addDays(startOfISOWeek(addWeeks(today, -1)), (WEEKDAYS[lastWeekday[2]] + 6) % 7)
    }
    if (input in WEEKDAYS) {
        const daysBack = (today.getDay() - WEEKDAYS[input] + 7) % 7
        return addDays(today, -daysBack)
    }

    const date = fnsParse(input, DATE_FORMAT, now)
    if (isValid(date)) return date
    throw Error(`Cannot parse "${when}" to a date. Use YYYY-MM-DD, y, t-2, a weekday like fri or last-fri. See ${appName} --help.`)
}

export function parseRange(unit: string, which: string | undefined, now: Date): DateRange {
    switch (unit.toLowerCase()) {
    case 'week':
    case 'woche':
        return parseWeek(which, now)
    case 'month':
    case 'monat':
        return parseMonth(which, now)
    default:
        throw Error(`Unknown range "${unit}". Use week or month.`)
    }
}

export function rangeFromDates(from: string, to: string, now: Date): DateRange {
    const fromDate = parseDay(from, now)
    const toDate = parseDay(to, now)
    if (toDate < fromDate) throw Error(`--to ${to} is before --from ${from}.`)
    return { from: startOfDay(fromDate), to: startOfDay(toDate), label: `${format(fromDate, DATE_FORMAT)} – ${format(toDate, DATE_FORMAT)}` }
}

function parseWeek(which: string | undefined, now: Date): DateRange {
    let reference = now
    const input = which?.trim().toLowerCase()
    if (input === undefined || input === '' || input === 'this' || input === 'current') {
        reference = now
    } else if (LAST_LITERALS.includes(input)) {
        reference = addWeeks(now, -1)
    } else if (/^-\d+$/.test(input)) {
        reference = addWeeks(now, parseInt(input))
    } else {
        const isoMatch = input.match(/^(\d{4})-?w(\d{1,2})$/)
        const slashMatch = input.match(/^(\d{1,2})(?:\/(\d{4}))?$/)
        const weekYear = isoMatch ? parseInt(isoMatch[1]) : slashMatch?.[2] ? parseInt(slashMatch[2]) : getISOWeekYear(now)
        const week = isoMatch ? parseInt(isoMatch[2]) : slashMatch ? parseInt(slashMatch[1]) : NaN
        if (!(week >= 1 && week <= 53)) {
            throw Error(`Cannot parse week "${which}". Use last, -2, 41, 41/2025 or 2025-W41.`)
        }
        reference = setISOWeek(setISOWeekYear(startOfISOWeek(now), weekYear), week)
        if (getISOWeekYear(reference) !== weekYear) throw Error(`${weekYear} has no week ${week}.`)
    }
    const from = startOfISOWeek(reference)
    return {
        from: from,
        to: startOfDay(endOfISOWeek(reference)),
        label: `Week ${getISOWeek(from)}/${getISOWeekYear(from)}, ${format(from, DATE_FORMAT)} – ${format(endOfISOWeek(reference), DATE_FORMAT)}`
    }
}

function parseMonth(which: string | undefined, now: Date): DateRange {
    let reference = now
    const input = which?.trim().toLowerCase()
    if (input === undefined || input === '' || input === 'this' || input === 'current') {
        reference = now
    } else if (LAST_LITERALS.includes(input)) {
        reference = addMonths(now, -1)
    } else if (/^-\d+$/.test(input)) {
        reference = addMonths(now, parseInt(input))
    } else {
        reference = fnsParse(input, 'yyyy-MM', now)
        if (!isValid(reference)) throw Error(`Cannot parse month "${which}". Use last, -2 or 2026-09.`)
    }
    return {
        from: startOfMonth(reference),
        to: startOfDay(endOfMonth(reference)),
        label: format(reference, 'MMMM yyyy')
    }
}

export function eachDay(range: DateRange): Date[] {
    const days: Date[] = []
    for (let day = range.from; day <= range.to; day = addDays(day, 1)) days.push(day)
    return days
}
