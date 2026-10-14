import cliTruncate from 'cli-truncate'
import Table, { HorizontalTable, Cell } from 'cli-table3'
import { format } from 'date-fns'
import chalk from 'chalk'
import { UserWorklogs, Worklog, findOverlapsIn } from './worklogs'
import issueKeyExtended, { AliasesPosition } from '../issueKeyExtended'

// How many columns should be removed, when verbose mode is off
const COLUMNS_TO_REMOVE = 3

export async function render(userWorklogs: UserWorklogs, verbose: boolean = false) {
    const { worklogHeaders, columnsNumber } = generateWorklogHeaders(verbose)
    const infoHeaders = generateInfoHeaders(userWorklogs, verbose, columnsNumber)
    const content = await generateContent(userWorklogs.worklogs, verbose, columnsNumber)
    const summaryFooter = generateDurationSummaryFooter(userWorklogs)
    const table = new Table() as HorizontalTable
    table.push(
        ...infoHeaders,
        worklogHeaders,
        ...content,
        summaryFooter
    )
    return table
}

function generateWorklogHeaders(verbose: boolean) {
    const headers = [
        { content: chalk.bold.greenBright('id'), hAlign: 'right' },
        { content: chalk.bold.greenBright('from-to'), hAlign: 'right' },
        { content: chalk.bold.greenBright('issue'), hAlign: 'right' },
        { content: chalk.bold.greenBright('duration'), hAlign: 'right' },
        chalk.bold.greenBright('type'),
        chalk.bold.greenBright('description'),
        chalk.bold.greenBright('issue url')
    ]
    if (!verbose) {
        headers.splice(headers.length - COLUMNS_TO_REMOVE, COLUMNS_TO_REMOVE)
    }
    return {
        worklogHeaders: headers.map((r) => r as Cell),
        columnsNumber: headers.length
    }
}

function generateInfoHeaders(userWorklogs: UserWorklogs, verbose: boolean, colSpan: number) {
    const details = userWorklogs.scheduleDetails
    const monthProgress = `${details.monthLoggedDuration}/${details.monthRequiredDuration}`
    const monthInfo = `${format(userWorklogs.date, 'MMMM')}: ${monthProgress} (${details.monthCurrentPeriodDuration})`
    const dateInfo = format(userWorklogs.date, 'eeee, yyyy-MM-dd')
    return [
        [{ colSpan: colSpan, hAlign: 'center', content: chalk.bold(monthInfo) }],
        [{ colSpan: colSpan, hAlign: 'center', content: chalk.bold(dateInfo) }]
    ].map((r) => r as Cell[])
}

async function generateContent(worklogs: Worklog[], verbose: boolean, colSpan: number) {
    if (worklogs.length === 0) {
        return [[{ colSpan: colSpan, content: chalk.redBright('No worklogs'), hAlign: 'center' }]].map((r) => r as Cell[])
    }
    const sorted = [...worklogs].sort((a, b) => (a.interval?.startTime ?? '').localeCompare(b.interval?.startTime ?? ''))
    const rows: Cell[][] = []
    for (const [index, worklog] of sorted.entries()) {
        const previous = sorted[index - 1]
        const gap = previous ? gapBetween(previous, worklog) : undefined
        if (gap) {
            rows.push([{ colSpan: colSpan, hAlign: 'center', content: chalk.gray(`not logged ${gap.from}-${gap.to} (${gap.duration})`) } as Cell])
        }
        const row = await generateWorklogRow(worklog, findOverlapsIn(worklog, sorted).length > 0)
        if (!verbose) row.splice(row.length - COLUMNS_TO_REMOVE, COLUMNS_TO_REMOVE)
        rows.push(row)
    }
    return rows
}

async function generateWorklogRow(worklog: Worklog, overlaps: boolean): Promise<Cell[]> {
    const issueKey = await issueKeyExtended(worklog.issueKey, AliasesPosition.Left)
    const interval = `${worklog.interval?.startTime}-${worklog.interval?.endTime}`
    return [
        { colSpan: 1, content: chalk.yellow(worklog.id), hAlign: 'right' },
        { colSpan: 1, content: overlaps ? chalk.bold.redBright(`${interval} overlap`) : interval, hAlign: 'right' },
        { colSpan: 1, content: issueKey, hAlign: 'right' },
        { colSpan: 1, content: worklog.duration, hAlign: 'right' },
        worklog.workType ?? '',
        cliTruncate(oneLine(worklog.description), 30),
        worklog.link
    ].map((r) => r as Cell)
}

export function gapBetween(previous: Worklog, next: Worklog): { from: string, to: string, duration: string } | undefined {
    const previousEnd = previous.interval?.endTime
    const nextStart = next.interval?.startTime
    if (!previousEnd || !nextStart || nextStart <= previousEnd) return undefined
    const minutes = toMinutes(nextStart) - toMinutes(previousEnd)
    return { from: previousEnd, to: nextStart, duration: minutesToDuration(minutes) }
}

function toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}

function minutesToDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return `${hours ? `${hours}h` : ''}${rest ? `${rest}m` : ''}` || '0h'
}

function generateDurationSummaryFooter(userWorklogs: UserWorklogs) {
    const details = userWorklogs.scheduleDetails
    const requiredInfo = `Required ${details.dayRequiredDuration}, logged:`
    const loggedDuration = `${chalk.yellow(details.dayLoggedDuration)}`
    return [
        { colSpan: 3, content: requiredInfo, hAlign: 'right' },
        { colSpan: 1, content: loggedDuration, hAlign: 'right' }
    ].map((r) => r as Cell)
}

export function oneLine(text: string | undefined): string {
    return (text ?? '').replace(/\s+/g, ' ').trim()
}
