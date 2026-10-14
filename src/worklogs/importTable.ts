import Table, { HorizontalTable, Cell } from 'cli-table3'
import chalk from 'chalk'
import cliTruncate from 'cli-truncate'
import { Worklog } from './worklogs'
import { toDuration } from './timeParser'
import { oneLine } from './worklogsTable'

export function render(worklogs: Worklog[]): HorizontalTable {
    const table = new Table() as HorizontalTable
    table.push(['#', 'date', 'from-to', 'issue', 'duration', 'type', 'description'].map(it => chalk.bold.greenBright(it)) as Cell[])
    worklogs.forEach((worklog, index) => {
        table.push([
            String(index + 1),
            worklog.date,
            `${worklog.interval?.startTime}-${worklog.interval?.endTime}`,
            chalk.bold(worklog.issueKey),
            { hAlign: 'right', content: worklog.duration },
            worklog.workType ?? chalk.gray('-'),
            cliTruncate(oneLine(worklog.description), 40)
        ] as Cell[])
    })
    const total = worklogs.reduce((sum, it) => sum + it.seconds, 0)
    table.push([{ colSpan: 4, hAlign: 'right', content: chalk.bold('total') }, { hAlign: 'right', content: chalk.bold.yellow(toDuration(total)) }, { colSpan: 2, content: '' }] as Cell[])
    return table
}
