import Table, { HorizontalTable, Cell } from 'cli-table3'
import chalk from 'chalk'
import cliTruncate from 'cli-truncate'
import { format, parse as fnsParse } from 'date-fns'
import { RangeWorklogs, DaySummary } from './worklogs'
import { gapBetween } from './worklogsTable'
import { toDuration } from './timeParser'
import { oneLine } from './worklogsTable'
import { DATE_FORMAT } from '../dates'
import time from '../time'

const ISSUES_SHOWN = 10

export function render(rangeWorklogs: RangeWorklogs, verbose = false): string {
    const table = new Table({ style: { compact: true } }) as HorizontalTable
    const today = format(time.now(), DATE_FORMAT)
    table.push([{ colSpan: 5, hAlign: 'center', content: chalk.bold(rangeWorklogs.range.label) }] as Cell[])
    table.push(['day', 'logged', 'required', 'difference', 'entries'].map(header => chalk.bold.greenBright(header)) as Cell[])
    for (const day of rangeWorklogs.days) {
        table.push(dayRow(day, today))
        if (verbose) {
            for (const row of entryRows(day)) table.push(row)
        }
    }
    const logged = sum(rangeWorklogs.days.map(it => it.loggedSeconds))
    const required = sum(rangeWorklogs.days.map(it => it.requiredSeconds))
    table.push([
        chalk.bold('total'),
        { hAlign: 'right', content: chalk.bold.yellow(toDuration(logged)) },
        { hAlign: 'right', content: chalk.bold(toDuration(required)) },
        { hAlign: 'right', content: chalk.bold(colorDifference(logged - required)) },
        { hAlign: 'right', content: chalk.bold(String(sum(rangeWorklogs.days.map(it => it.worklogs.length)))) }
    ] as Cell[])
    const issues = issueTable(rangeWorklogs.days, verbose)
    return issues ? `${table.toString()}\n${issues}` : table.toString()
}

function dayRow(day: DaySummary, today: string): Cell[] {
    const date = fnsParse(day.date, DATE_FORMAT, time.now())
    const label = `${format(date, 'EEE')} ${day.date}`
    const isPastOrToday = day.date <= today
    const difference = day.loggedSeconds - day.requiredSeconds
    const nothingDue = day.requiredSeconds === 0 && day.loggedSeconds === 0
    return [
        nothingDue ? chalk.gray(label) : chalk.bold(label),
        { hAlign: 'right', content: day.loggedSeconds ? chalk.yellow(toDuration(day.loggedSeconds)) : chalk.gray('0h') },
        { hAlign: 'right', content: day.requiredSeconds ? toDuration(day.requiredSeconds) : chalk.gray('0h') },
        { hAlign: 'right', content: nothingDue || !isPastOrToday ? chalk.gray(toDuration(difference, true)) : colorDifference(difference) },
        { hAlign: 'right', content: String(day.worklogs.length) }
    ] as Cell[]
}

function entryRows(day: DaySummary): Cell[][] {
    const rows: Cell[][] = []
    day.worklogs.forEach((worklog, index) => {
        const gap = index > 0 ? gapBetween(day.worklogs[index - 1], worklog) : undefined
        if (gap) {
            rows.push([{ colSpan: 5, content: chalk.gray(`    not logged ${gap.from}-${gap.to} (${gap.duration})`) }] as Cell[])
        }
        const interval = `${worklog.interval?.startTime}-${worklog.interval?.endTime}`
        const details = [chalk.bold(worklog.issueKey), worklog.workType, cliTruncate(oneLine(worklog.description), 40)].filter(Boolean).join('  ')
        rows.push([
            { content: `  ${chalk.yellow(worklog.id)} ${interval}` },
            { hAlign: 'right', content: worklog.duration },
            { colSpan: 3, content: details }
        ] as Cell[])
    })
    return rows
}

function issueTable(days: DaySummary[], verbose: boolean): string | undefined {
    const totals = new Map<string, number>()
    for (const worklog of days.flatMap(it => it.worklogs)) {
        totals.set(worklog.issueKey, (totals.get(worklog.issueKey) ?? 0) + worklog.seconds)
    }
    if (totals.size === 0) return undefined
    const all = sum([...totals.values()])
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
    const shown = verbose ? sorted : sorted.slice(0, ISSUES_SHOWN)
    const table = new Table({ style: { compact: true } }) as HorizontalTable
    table.push(['issue', 'logged', 'share'].map(header => chalk.bold.greenBright(header)) as Cell[])
    for (const [issueKey, seconds] of shown) {
        table.push([
            chalk.bold(issueKey),
            { hAlign: 'right', content: chalk.yellow(toDuration(seconds)) },
            { hAlign: 'right', content: `${Math.round(seconds / all * 100)}%` }
        ] as Cell[])
    }
    const hidden = sorted.slice(shown.length)
    if (hidden.length > 0) {
        table.push([
            chalk.gray(`${hidden.length} more (-v)`),
            { hAlign: 'right', content: chalk.gray(toDuration(sum(hidden.map(it => it[1])))) },
            { hAlign: 'right', content: chalk.gray(`${Math.round(sum(hidden.map(it => it[1])) / all * 100)}%`) }
        ] as Cell[])
    }
    return table.toString()
}

function colorDifference(seconds: number): string {
    const text = toDuration(seconds, true)
    if (seconds < 0) return chalk.redBright(text)
    if (seconds > 0) return chalk.greenBright(text)
    return text
}

function sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0)
}
