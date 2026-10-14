import api, { IssueSummary, AddWorklogRequest, WorklogEntity, WorkAttributeEntity, WorkAttributeValue, UpdateWorklogRequest } from '../api/api'
import * as timeParser from './timeParser'
import { ParseResult, Interval } from './timeParser'
import time from '../time'
import { format, parse as fnsParse } from 'date-fns'
import { ScheduleDetails } from './schedule'
import * as schedule from './schedule'
import { appName } from '../appName'
import authenticator from '../config/authenticator'
import aliases from '../config/aliases'
import configStore, { LastAction, WorklogSnapshot } from '../config/configStore'
import { DATE_FORMAT, DateRange, eachDay, parseDay } from '../dates'
import { addDays, endOfMonth, startOfMonth } from 'date-fns'

const START_TIME_FORMAT = 'HH:mm:ss'
const WORK_TYPE_KEY = '_WorkType_'

export type AddWorklogInput = {
    issueKeyOrAlias: string
    durationOrInterval: string
    when?: string
    description?: string
    startTime?: string,
    remainingEstimate?: string,
    workType?: string
}

export type EditWorklogInput = {
    worklogId: string
    issueKeyOrAlias?: string
    durationOrInterval?: string
    when?: string
    startTime?: string
    description?: string
    workType?: string
    remainingEstimate?: string
}

export type Worklog = {
    id: string,
    date: string,
    interval?: Interval,
    seconds: number,
    issueId: string,
    issueKey: string,
    duration: string,
    description: string,
    link: string,
    workType?: string
}

export type PreparedWorklog = {
    request: AddWorklogRequest
    preview: Worklog
}

export type AddWorklogResult = {
    worklog: Worklog
    overlaps: Worklog[]
}

export type UserWorklogs = {
    worklogs: Worklog[]
    date: Date,
    scheduleDetails: ScheduleDetails
}

export type DaySummary = {
    date: string
    requiredSeconds: number
    loggedSeconds: number
    worklogs: Worklog[]
}

export type RangeWorklogs = {
    range: DateRange
    days: DaySummary[]
}

export class WorkTypes {
    private attribute?: Promise<WorkAttributeEntity | undefined>

    private load(): Promise<WorkAttributeEntity | undefined> {
        this.attribute ??= api.getWorkAttributes().then(all => all.find(it => it.key === WORK_TYPE_KEY))
        return this.attribute
    }

    async resolve(workType: string): Promise<WorkAttributeValue> {
        const attribute = await this.load()
        if (!attribute) throw Error(`This Tempo instance has no Work Type attribute. See ${appName} work-attributes.`)
        const names = attribute.names ?? {}
        const wanted = workType.trim().toLowerCase()
        const value = (attribute.values ?? []).find(it => it.toLowerCase() === wanted || names[it]?.toLowerCase() === wanted)
        if (!value) {
            const allowed = (attribute.values ?? []).map(it => names[it] ?? it).join(', ')
            throw Error(`Unknown work type "${workType}". Allowed: ${allowed}`)
        }
        return { key: WORK_TYPE_KEY, value: value }
    }

    async nameOf(value: string): Promise<string> {
        try {
            return (await this.load())?.names?.[value] ?? value
        } catch {
            return value
        }
    }
}

export default {

    async prepareWorklog(input: AddWorklogInput, workTypes = new WorkTypes()): Promise<PreparedWorklog> {
        await checkTokens()
        const referenceDate = parseDay(input.when, time.now())
        const parseResult = timeParser.parse(input.durationOrInterval, referenceDate)
        if (parseResult == null) {
            throw Error(`Error parsing "${input.durationOrInterval}". Try something like 1h10m or 11-12:30. See ${appName} log --help for more examples.`)
        }
        if (parseResult.seconds <= 0) {
            throw Error('Error. Minutes worked must be larger than 0.')
        }
        const issueKey = (await aliases.getIssueKey(input.issueKeyOrAlias) ?? input.issueKeyOrAlias).toUpperCase()
        const workTypeName = await resolveWorkTypeName(input.workType, input.issueKeyOrAlias)
        const issueId = await api.getIssueId(issueKey)
        const attribute = workTypeName ? await workTypes.resolve(workTypeName) : undefined
        const request: AddWorklogRequest = {
            issueId: issueId,
            timeSpentSeconds: parseResult.seconds,
            startDate: format(referenceDate, DATE_FORMAT),
            startTime: startTime(parseResult, input.startTime, referenceDate),
            description: input.description,
            remainingEstimateSeconds: remainingEstimateSeconds(referenceDate, input.remainingEstimate),
            attributes: attribute ? [attribute] : undefined
        }
        const preview = toWorklog({
            tempoWorklogId: '(new)',
            startDate: request.startDate,
            startTime: request.startTime,
            timeSpentSeconds: request.timeSpentSeconds,
            description: request.description ?? '',
            issue: { id: issueId, self: '' },
            author: { accountId: '' }
        }, { [issueId]: issueKey }, attribute ? await workTypes.nameOf(attribute.value) : undefined)
        return { request, preview }
    },

    async sendWorklog(prepared: PreparedWorklog): Promise<Worklog> {
        const worklogEntity = await api.addWorklog(prepared.request)
        return toWorklog(worklogEntity, { [worklogEntity.issue.id]: prepared.preview.issueKey }, prepared.preview.workType)
    },

    async addWorklog(input: AddWorklogInput, dryRun = false): Promise<AddWorklogResult> {
        const prepared = await this.prepareWorklog(input)
        const overlaps = await findOverlaps(prepared.preview)
        if (dryRun) return { worklog: prepared.preview, overlaps }
        const worklog = await this.sendWorklog(prepared)
        await recordLastAction({ type: 'log', worklogIds: [worklog.id] })
        return { worklog, overlaps }
    },

    async getWorklog(worklogIdInput: string): Promise<Worklog> {
        await checkTokens()
        const entity = await api.getWorklog(parseWorklogId(worklogIdInput))
        return toWorklogWithKey(entity, new WorkTypes())
    },

    async editWorklog(input: EditWorklogInput, dryRun = false): Promise<{ before: Worklog, after: Worklog }> {
        await checkTokens()
        const worklogId = parseWorklogId(input.worklogId)
        const entity = await api.getWorklog(worklogId)
        const workTypes = new WorkTypes()
        const before = await toWorklogWithKey(entity, workTypes)
        const current = snapshotOf(entity)

        const referenceDate = input.when ? parseDay(input.when, time.now()) : fnsParse(current.startDate, DATE_FORMAT, time.now())
        const parsed = input.durationOrInterval ? timeParser.parse(input.durationOrInterval, referenceDate) : null
        if (input.durationOrInterval && parsed == null) {
            throw Error(`Error parsing "${input.durationOrInterval}". Try something like 1h10m or 11-12:30.`)
        }
        if (parsed && parsed.seconds <= 0) throw Error('Error. Minutes worked must be larger than 0.')
        const timeSpentSeconds = parsed?.seconds ?? current.timeSpentSeconds
        let newStartTime = current.startTime
        if (parsed?.startTime) newStartTime = parsed.startTime
        else if (input.startTime) newStartTime = parseStartTime(input.startTime, referenceDate)
        const attributes = input.workType
            ? replaceAttribute(current.attributes, await workTypes.resolve(input.workType))
            : current.attributes

        const issueKey = input.issueKeyOrAlias
            ? (await aliases.getIssueKey(input.issueKeyOrAlias) ?? input.issueKeyOrAlias).toUpperCase()
            : before.issueKey
        const issueId = input.issueKeyOrAlias ? await api.getIssueId(issueKey) : current.issueId
        const updated: WorklogSnapshot = {
            issueId: issueId,
            timeSpentSeconds: timeSpentSeconds,
            startDate: format(referenceDate, DATE_FORMAT),
            startTime: newStartTime,
            description: input.description ?? current.description,
            attributes: attributes
        }
        const remaining = remainingEstimateSeconds(referenceDate, input.remainingEstimate)
        const workTypeName = await workTypeNameOf(attributes, workTypes)
        const preview = toWorklog(entityOf(updated, String(entity.tempoWorklogId)), { [issueId]: issueKey }, workTypeName)
        if (dryRun) return { before, after: preview }

        if (issueId !== current.issueId) {
            const created = await api.addWorklog({ ...requestOf(updated), remainingEstimateSeconds: remaining })
            await api.deleteWorklog(worklogId)
            await recordLastAction({ type: 'move', worklogId: String(created.tempoWorklogId), previous: current })
            return { before, after: toWorklog(created, { [issueId]: issueKey }, workTypeName) }
        }
        const updateRequest: UpdateWorklogRequest = {
            ...requestOf(updated),
            billableSeconds: timeSpentSeconds === current.timeSpentSeconds ? entity.billableSeconds : undefined,
            remainingEstimateSeconds: remaining
        }
        const saved = await api.updateWorklog(worklogId, updateRequest)
        await recordLastAction({ type: 'edit', worklogId: String(worklogId), previous: current })
        return { before, after: toWorklog(saved, { [issueId]: issueKey }, workTypeName) }
    },

    async copyWorklog(worklogIdInput: string, when?: string, startTimeInput?: string, dryRun = false): Promise<AddWorklogResult> {
        await checkTokens()
        const entity = await api.getWorklog(parseWorklogId(worklogIdInput))
        const workTypes = new WorkTypes()
        const source = await toWorklogWithKey(entity, workTypes)
        const snapshot = snapshotOf(entity)
        const referenceDate = when ? parseDay(when, time.now()) : time.now()
        const copy: WorklogSnapshot = {
            ...snapshot,
            startDate: format(referenceDate, DATE_FORMAT),
            startTime: startTimeInput ? parseStartTime(startTimeInput, referenceDate) : snapshot.startTime
        }
        const preview = toWorklog(entityOf(copy, '(new)'), { [copy.issueId]: source.issueKey }, source.workType)
        const overlaps = await findOverlaps(preview)
        if (dryRun) return { worklog: preview, overlaps }
        const created = await api.addWorklog(requestOf(copy))
        const worklog = toWorklog(created, { [copy.issueId]: source.issueKey }, source.workType)
        await recordLastAction({ type: 'log', worklogIds: [worklog.id] })
        return { worklog, overlaps }
    },

    async getWorkAttributes(): Promise<WorkAttributeEntity[]> {
        await checkTokens()
        return api.getWorkAttributes()
    },

    async deleteWorklog(worklogIdInput: string, dryRun = false): Promise<Worklog> {
        await checkTokens()
        const worklogId = parseWorklogId(worklogIdInput)
        const worklogEntity = await api.getWorklog(worklogId)
        const worklog = await toWorklogWithKey(worklogEntity, new WorkTypes())
        if (dryRun) return worklog
        await api.deleteWorklog(worklogId)
        await recordLastAction({ type: 'delete', worklog: snapshotOf(worklogEntity) })
        return worklog
    },

    async recordImport(worklogIds: string[]) {
        if (worklogIds.length > 0) await recordLastAction({ type: 'log', worklogIds: worklogIds })
    },

    async undo(dryRun = false): Promise<{ description: string }> {
        await checkTokens()
        const config = await configStore.read()
        const action = config.lastAction
        if (!action) throw Error('Nothing to undo.')
        const description = describeAction(action)
        if (dryRun) return { description }
        switch (action.type) {
        case 'log':
            for (const id of action.worklogIds) await api.deleteWorklog(parseWorklogId(id))
            break
        case 'delete':
            await api.addWorklog(requestOf(action.worklog))
            break
        case 'edit':
            await api.updateWorklog(parseWorklogId(action.worklogId), requestOf(action.previous))
            break
        case 'move':
            await api.addWorklog(requestOf(action.previous))
            await api.deleteWorklog(parseWorklogId(action.worklogId))
            break
        }
        await recordLastAction(undefined)
        return { description }
    },

    async getUserWorklogs(when?: string): Promise<UserWorklogs> {
        await checkTokens()
        const credentials = await authenticator.getCredentials()
        const now = time.now()
        const date = parseDay(when, now)
        const formattedDate = format(date, DATE_FORMAT)
        const monthStart = format(startOfMonth(date), DATE_FORMAT)
        const monthEnd = format(endOfMonth(date), DATE_FORMAT)
        const [worklogsResponse, scheduleResponse] = await Promise.all([
            api.getWorklogs({ fromDate: monthStart, toDate: monthEnd }),
            api.getUserSchedule({ fromDate: monthStart, toDate: monthEnd })
        ])
        const dayEntities = worklogsResponse.results
            .filter((e: WorklogEntity) => e.author.accountId === credentials.accountId && e.startDate === formattedDate)
        const worklogs = await toWorklogs(dayEntities)
        const scheduleDetails = schedule.createScheduleDetails(
            worklogsResponse.results,
            scheduleResponse.results,
            formattedDate,
            credentials.accountId
        )

        return { worklogs, date, scheduleDetails }
    },

    async getRangeWorklogs(range: DateRange): Promise<RangeWorklogs> {
        await checkTokens()
        const credentials = await authenticator.getCredentials()
        const fromDate = format(range.from, DATE_FORMAT)
        const toDate = format(range.to, DATE_FORMAT)
        const [worklogsResponse, scheduleResponse] = await Promise.all([
            api.getWorklogs({ fromDate, toDate }),
            api.getUserSchedule({ fromDate, toDate })
        ])
        const entities = worklogsResponse.results.filter(e => e.author.accountId === credentials.accountId)
        const worklogs = await toWorklogs(entities)
        const days = eachDay(range).map(day => {
            const date = format(day, DATE_FORMAT)
            const dayWorklogs = worklogs.filter(it => it.date === date)
                .sort((a, b) => (a.interval?.startTime ?? '').localeCompare(b.interval?.startTime ?? ''))
            return {
                date: date,
                requiredSeconds: scheduleResponse.results.filter(it => it.date === date).reduce((sum, it) => sum + it.requiredSeconds, 0),
                loggedSeconds: dayWorklogs.reduce((sum, it) => sum + it.seconds, 0),
                worklogs: dayWorklogs
            }
        })
        return { range, days }
    },

    async getRecentIssues(days = 14, limit = 10): Promise<IssueSummary[]> {
        await checkTokens()
        const credentials = await authenticator.getCredentials()
        const now = time.now()
        const response = await api.getWorklogs({
            fromDate: format(addDays(now, -days), DATE_FORMAT),
            toDate: format(now, DATE_FORMAT)
        })
        const entities = response.results
            .filter(e => e.author.accountId === credentials.accountId)
            .sort((a, b) => `${b.startDate}${b.startTime}`.localeCompare(`${a.startDate}${a.startTime}`))
        const issueIds = [...new Set(entities.map(e => String(e.issue.id)))].slice(0, limit)
        const summaries = await api.getIssueSummaries(issueIds)
        return issueIds.map(id => summaries.find(it => it.id === id)).filter((it): it is IssueSummary => it !== undefined)
    }
}

export function findOverlapsIn(worklog: Worklog, others: Worklog[]): Worklog[] {
    if (!worklog.interval) return []
    const start = worklog.interval.startTime
    const end = endOf(worklog)
    return others.filter(other => other.id !== worklog.id && other.date === worklog.date && other.interval &&
        other.interval.startTime < end && start < endOf(other))
}

function endOf(worklog: Worklog): string {
    const [hours, minutes] = (worklog.interval?.startTime ?? '00:00').split(':').map(Number)
    const total = hours * 60 + minutes + Math.round(worklog.seconds / 60)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

async function findOverlaps(worklog: Worklog): Promise<Worklog[]> {
    try {
        const credentials = await authenticator.getCredentials()
        const response = await api.getWorklogs({ fromDate: worklog.date, toDate: worklog.date })
        const sameDay = response.results.filter(e => e.author.accountId === credentials.accountId && e.startDate === worklog.date)
        const overlapping = findOverlapsIn(worklog, sameDay.map(e => toWorklog(e, {})))
        if (overlapping.length === 0) return []
        return toWorklogs(sameDay.filter(e => overlapping.some(o => o.id === String(e.tempoWorklogId))))
    } catch {
        return []
    }
}

async function toWorklogs(entities: WorklogEntity[]): Promise<Worklog[]> {
    const uniqueIssueIds = [...new Set(entities.map(worklog => String(worklog.issue.id)))]
    const issueKeys = await Promise.all(uniqueIssueIds.map(issueId => api.getIssueKey(issueId)))
    const issueIdToKey = Object.fromEntries(uniqueIssueIds.map((id, index) => [id, issueKeys[index]]))
    const workTypes = new WorkTypes()
    return Promise.all(entities.map(async e => toWorklog(e, issueIdToKey, await workTypeNameOf(e.attributes?.values, workTypes))))
}

async function toWorklogWithKey(entity: WorklogEntity, workTypes: WorkTypes): Promise<Worklog> {
    const issueKey = await api.getIssueKey(String(entity.issue.id))
    return toWorklog(entity, { [entity.issue.id]: issueKey }, await workTypeNameOf(entity.attributes?.values, workTypes))
}

async function workTypeNameOf(attributes: WorkAttributeValue[] | undefined, workTypes: WorkTypes): Promise<string | undefined> {
    const value = attributes?.find(it => it.key === WORK_TYPE_KEY)?.value
    return value ? workTypes.nameOf(value) : undefined
}

function toWorklog(entity: WorklogEntity, issueIdToKey: Record<string, string>, workType?: string): Worklog {
    const referenceDate = fnsParse(entity.startDate, DATE_FORMAT, time.now())
    const issueKey = issueIdToKey[entity.issue.id]
    const worklog: Worklog = {
        id: String(entity.tempoWorklogId),
        date: entity.startDate,
        interval: timeParser.toInterval(entity.timeSpentSeconds, entity.startTime, referenceDate) ?? undefined,
        seconds: entity.timeSpentSeconds,
        issueId: String(entity.issue.id),
        duration: timeParser.toDuration(entity.timeSpentSeconds) ?? 'unknown',
        description: entity.description,
        issueKey: issueKey,
        link: entity.issue.self ? generateIssueLink(issueKey, entity.issue.self) : ''
    }
    if (workType) worklog.workType = workType
    return worklog
}

function snapshotOf(entity: WorklogEntity): WorklogSnapshot {
    return {
        issueId: String(entity.issue.id),
        timeSpentSeconds: entity.timeSpentSeconds,
        startDate: entity.startDate,
        startTime: entity.startTime,
        description: entity.description,
        attributes: entity.attributes?.values?.map(it => ({ key: it.key, value: it.value }))
    }
}

function entityOf(snapshot: WorklogSnapshot, id: string): WorklogEntity {
    return {
        tempoWorklogId: id,
        startDate: snapshot.startDate,
        startTime: snapshot.startTime,
        timeSpentSeconds: snapshot.timeSpentSeconds,
        description: snapshot.description ?? '',
        issue: { id: snapshot.issueId, self: '' },
        author: { accountId: '' }
    }
}

function requestOf(snapshot: WorklogSnapshot): AddWorklogRequest {
    return {
        issueId: snapshot.issueId,
        timeSpentSeconds: snapshot.timeSpentSeconds,
        startDate: snapshot.startDate,
        startTime: snapshot.startTime,
        description: snapshot.description,
        attributes: snapshot.attributes
    }
}

function replaceAttribute(attributes: WorkAttributeValue[] | undefined, attribute: WorkAttributeValue): WorkAttributeValue[] {
    return [...(attributes ?? []).filter(it => it.key !== attribute.key), attribute]
}

async function resolveWorkTypeName(workType: string | undefined, issueKeyOrAlias: string): Promise<string | undefined> {
    if (workType) return workType
    const aliasWorkType = await aliases.getWorkType(issueKeyOrAlias)
    if (aliasWorkType) return aliasWorkType
    return (await configStore.read()).defaultWorkType
}

async function recordLastAction(action: LastAction | undefined) {
    const config = await configStore.read()
    config.lastAction = action
    await configStore.save(config)
}

function describeAction(action: LastAction): string {
    switch (action.type) {
    case 'log':
        return `delete the worklog${action.worklogIds.length > 1 ? 's' : ''} you logged last: ${action.worklogIds.join(', ')}`
    case 'delete':
        return `restore the worklog you deleted last (${action.worklog.startDate} ${action.worklog.startTime.slice(0, 5)}, ` +
            `${timeParser.toDuration(action.worklog.timeSpentSeconds)}); it gets a new id`
    case 'edit':
        return `revert your last edit of worklog ${action.worklogId}`
    case 'move':
        return `move worklog ${action.worklogId} back to its previous issue; it gets a new id`
    }
}

function parseWorklogId(worklogIdInput: string): number {
    if (!/^\d+$/.test(worklogIdInput.trim())) {
        throw Error('Error. Worklog id should be an integer number.')
    }
    return parseInt(worklogIdInput.trim())
}

async function checkTokens() {
    const isTempoTokenSet = await authenticator.hasTempoToken()
    const isAtlassianTokenSet = await authenticator.hasAtlassianToken()
    if (!isTempoTokenSet || !isAtlassianTokenSet) {
        throw Error('This tool is not configured. Set up tempomat by `tempo setup` command.')
    }
}

function remainingEstimateSeconds(referenceDate: Date, remainingEstimate?: string): number | undefined {
    if (remainingEstimate) {
        const result = timeParser.parse(remainingEstimate, referenceDate)
        if (result == null) {
            throw Error(`Error parsing "${remainingEstimate}". Try something like 1h. See ${appName} log --help for more examples.`)
        }
        return result.seconds
    }
    return undefined
}

function startTime(parseResult: ParseResult, inputStartTime: string | undefined, referenceDate: Date) {
    if (parseResult.startTime) {
        if (inputStartTime) console.log(`Start time param is ignored, ${parseResult.startTime} is used instead.`)
        return parseResult.startTime
    }
    if (inputStartTime) return parseStartTime(inputStartTime, referenceDate)
    return format(referenceDate, START_TIME_FORMAT)
}

function parseStartTime(startTime: string, referenceDate: Date): string {
    const parsedTime = timeParser.parseTime(startTime, referenceDate)
    if (parsedTime) {
        return format(parsedTime, START_TIME_FORMAT)
    } else {
        throw Error(`Cannot parse ${startTime} to valid start time. Try to use HH:mm format. See ${appName} --help for more examples.`)
    }
}

function generateIssueLink(issueKey: string, self: string): string {
    const url = new URL(self)
    return `https://${url.hostname}/browse/${issueKey}`
}
