import { mockCurrentDate } from './mocks/currentDate'
import api, { WorklogEntity } from '../src/api/api'
import worklogs, { findOverlapsIn, Worklog } from '../src/worklogs/worklogs'
import configStore from '../src/config/configStore'
import aliases from '../src/config/aliases'
import { fakeCredentials } from './mocks/fakeCredentials'
import { parseRange } from '../src/dates'

jest.mock('../src/config/configStore', () => jest.requireActual('./mocks/configStore'))

const WORK_TYPES = [{
    key: '_WorkType_',
    name: 'Work Type',
    type: 'STATIC_LIST',
    required: true,
    values: ['uuid-dev', 'uuid-concept'],
    names: { 'uuid-dev': 'Entwicklung', 'uuid-concept': 'Konzeption' }
}]

function entity(overrides: Partial<WorklogEntity> = {}): WorklogEntity {
    return {
        tempoWorklogId: '500',
        issue: { self: 'https://example.atlassian.net/rest/api/2/issue/123', id: '123' },
        timeSpentSeconds: 3600,
        billableSeconds: 1800,
        startDate: '2020-02-27',
        startTime: '09:00:00',
        description: 'original',
        author: { accountId: 'fakeAccountId' },
        attributes: { values: [{ key: '_WorkType_', value: 'uuid-dev' }, { key: '_Other_', value: 'x' }] },
        ...overrides
    }
}

beforeEach(async () => {
    jest.resetAllMocks()
    await configStore.save({})
    fakeCredentials()
    mockCurrentDate(new Date('2020-02-28T12:00:00.000+01:00'))
    api.getIssueKey = jest.fn((issueId) => Promise.resolve(`ABC-${issueId}`))
    api.getIssueId = jest.fn((issueKey) => Promise.resolve(issueKey.split('-')[1]))
    api.getWorkAttributes = jest.fn().mockResolvedValue(WORK_TYPES)
    api.getWorklogs = jest.fn().mockResolvedValue({ results: [] })
    api.getWorklog = jest.fn().mockResolvedValue(entity())
    api.addWorklog = jest.fn((request) => Promise.resolve(entity({
        tempoWorklogId: '900', issue: { id: request.issueId, self: '' }, startDate: request.startDate, startTime: request.startTime,
        timeSpentSeconds: request.timeSpentSeconds, description: request.description, attributes: { values: request.attributes }
    })))
    api.updateWorklog = jest.fn((id, request) => Promise.resolve(entity({ ...request, attributes: { values: request.attributes } })))
    api.deleteWorklog = jest.fn()
})

describe('work type', () => {
    test('uses the configured default when no work type is given', async () => {
        await configStore.save({ ...(await configStore.read()), defaultWorkType: 'Entwicklung' })

        await worklogs.addWorklog({ issueKeyOrAlias: 'ABC-123', durationOrInterval: '1h' })

        expect(api.addWorklog).toHaveBeenCalledWith(expect.objectContaining({ attributes: [{ key: '_WorkType_', value: 'uuid-dev' }] }))
    })

    test('prefers the alias work type over the default, and -w over both', async () => {
        await configStore.save({ ...(await configStore.read()), defaultWorkType: 'Entwicklung' })
        await aliases.set('concept', 'ABC-123', 'Konzeption')

        await worklogs.addWorklog({ issueKeyOrAlias: 'concept', durationOrInterval: '1h' })
        await worklogs.addWorklog({ issueKeyOrAlias: 'concept', durationOrInterval: '1h', workType: 'Entwicklung' })

        expect((api.addWorklog as jest.Mock).mock.calls[0][0].attributes).toEqual([{ key: '_WorkType_', value: 'uuid-concept' }])
        expect((api.addWorklog as jest.Mock).mock.calls[1][0].attributes).toEqual([{ key: '_WorkType_', value: 'uuid-dev' }])
    })
})

describe('dry run', () => {
    test('log sends nothing and records nothing', async () => {
        const result = await worklogs.addWorklog({ issueKeyOrAlias: 'ABC-123', durationOrInterval: '9-10:30', workType: 'konzeption' }, true)

        expect(api.addWorklog).not.toHaveBeenCalled()
        expect((await configStore.read()).lastAction).toBeUndefined()
        expect(result.worklog).toMatchObject({ issueKey: 'ABC-123', date: '2020-02-28', duration: '1h30m', workType: 'Konzeption' })
    })

    test('edit and delete send nothing', async () => {
        await worklogs.editWorklog({ worklogId: '500', durationOrInterval: '2h' }, true)
        await worklogs.deleteWorklog('500', true)

        expect(api.updateWorklog).not.toHaveBeenCalled()
        expect(api.deleteWorklog).not.toHaveBeenCalled()
    })
})

describe('edit', () => {
    test('changes the time and keeps the other fields and all attributes', async () => {
        const result = await worklogs.editWorklog({ worklogId: '500', durationOrInterval: '2h' })

        expect(api.updateWorklog).toHaveBeenCalledWith(500, {
            issueId: '123',
            timeSpentSeconds: 7200,
            startDate: '2020-02-27',
            startTime: '09:00:00',
            description: 'original',
            attributes: [{ key: '_WorkType_', value: 'uuid-dev' }, { key: '_Other_', value: 'x' }],
            billableSeconds: undefined,
            remainingEstimateSeconds: undefined
        })
        expect(result.before.duration).toBe('1h')
        expect(result.after.duration).toBe('2h')
    })

    test('keeps billable seconds when the time is unchanged', async () => {
        await worklogs.editWorklog({ worklogId: '500', description: 'better' })

        expect(api.updateWorklog).toHaveBeenCalledWith(500, expect.objectContaining({ description: 'better', billableSeconds: 1800 }))
    })

    test('changes start, day and work type', async () => {
        await worklogs.editWorklog({ worklogId: '500', startTime: '10:15', when: 'y', workType: 'Konzeption' })

        expect(api.updateWorklog).toHaveBeenCalledWith(500, expect.objectContaining({
            startDate: '2020-02-27',
            startTime: '10:15:00',
            timeSpentSeconds: 3600,
            attributes: [{ key: '_Other_', value: 'x' }, { key: '_WorkType_', value: 'uuid-concept' }]
        }))
    })

    test('an interval sets start and duration', async () => {
        await worklogs.editWorklog({ worklogId: '500', durationOrInterval: '13-14:30' })

        expect(api.updateWorklog).toHaveBeenCalledWith(500, expect.objectContaining({ startTime: '13:00:00', timeSpentSeconds: 5400 }))
    })

    test('moving to another issue logs the new worklog before deleting the old one', async () => {
        const calls: string[] = []
        ;(api.addWorklog as jest.Mock).mockImplementation(async () => { calls.push('add'); return entity({ tempoWorklogId: '901', issue: { id: '777', self: '' } }) })
        ;(api.deleteWorklog as jest.Mock).mockImplementation(async () => { calls.push('delete') })

        const result = await worklogs.editWorklog({ worklogId: '500', issueKeyOrAlias: 'abc-777' })

        expect(calls).toEqual(['add', 'delete'])
        expect(api.addWorklog).toHaveBeenCalledWith(expect.objectContaining({ issueId: '777', description: 'original' }))
        expect(api.updateWorklog).not.toHaveBeenCalled()
        expect(result.after.id).toBe('901')
    })

    test('a failed log while moving keeps the original worklog', async () => {
        ;(api.addWorklog as jest.Mock).mockRejectedValue(Error('boom'))

        await expect(worklogs.editWorklog({ worklogId: '500', issueKeyOrAlias: 'abc-777' })).rejects.toThrow('boom')

        expect(api.deleteWorklog).not.toHaveBeenCalled()
    })
})

describe('copy', () => {
    test('logs the same issue, time, description and attributes on another day', async () => {
        const result = await worklogs.copyWorklog('500', 'y', '14:00')

        expect(api.addWorklog).toHaveBeenCalledWith({
            issueId: '123',
            timeSpentSeconds: 3600,
            startDate: '2020-02-27',
            startTime: '14:00:00',
            description: 'original',
            attributes: [{ key: '_WorkType_', value: 'uuid-dev' }, { key: '_Other_', value: 'x' }]
        })
        expect(result.worklog.id).toBe('900')
    })
})

describe('undo', () => {
    test('fails when there is nothing to undo', async () => {
        await expect(worklogs.undo()).rejects.toThrow('Nothing to undo.')
    })

    test('deletes the last logged worklog', async () => {
        await worklogs.addWorklog({ issueKeyOrAlias: 'ABC-123', durationOrInterval: '1h' })

        await worklogs.undo()

        expect(api.deleteWorklog).toHaveBeenCalledWith(900)
        expect((await configStore.read()).lastAction).toBeUndefined()
    })

    test('restores the last deleted worklog with its attributes', async () => {
        await worklogs.deleteWorklog('500')

        await worklogs.undo()

        expect(api.addWorklog).toHaveBeenCalledWith(expect.objectContaining({
            issueId: '123', startDate: '2020-02-27', startTime: '09:00:00', timeSpentSeconds: 3600,
            attributes: [{ key: '_WorkType_', value: 'uuid-dev' }, { key: '_Other_', value: 'x' }]
        }))
    })

    test('reverts the last edit', async () => {
        await worklogs.editWorklog({ worklogId: '500', durationOrInterval: '2h' })

        await worklogs.undo()

        expect(api.updateWorklog).toHaveBeenLastCalledWith(500, expect.objectContaining({ timeSpentSeconds: 3600, description: 'original' }))
    })

    test('moves a moved worklog back', async () => {
        ;(api.addWorklog as jest.Mock).mockResolvedValue(entity({ tempoWorklogId: '901', issue: { id: '777', self: '' } }))
        await worklogs.editWorklog({ worklogId: '500', issueKeyOrAlias: 'ABC-777' })

        await worklogs.undo()

        expect(api.addWorklog).toHaveBeenLastCalledWith(expect.objectContaining({ issueId: '123' }))
        expect(api.deleteWorklog).toHaveBeenLastCalledWith(901)
    })

    test('a dry run only describes the undo', async () => {
        await worklogs.addWorklog({ issueKeyOrAlias: 'ABC-123', durationOrInterval: '1h' })

        const plan = await worklogs.undo(true)

        expect(plan.description).toContain('900')
        expect(api.deleteWorklog).not.toHaveBeenCalled()
    })
})

describe('overlaps', () => {
    const worklog = (id: string, startTime: string, seconds: number): Worklog => ({
        id, date: '2020-02-28', interval: { startTime, endTime: '' }, seconds, issueId: '1', issueKey: 'ABC-1', duration: '', description: '', link: ''
    })

    test('finds worklogs that overlap, not ones that only touch', () => {
        const others = [worklog('1', '08:00', 3600), worklog('2', '09:30', 1800), worklog('3', '10:00', 3600)]

        expect(findOverlapsIn(worklog('new', '09:00', 3600), others).map(it => it.id)).toEqual(['2'])
    })

    test('are reported when logging', async () => {
        ;(api.getWorklogs as jest.Mock).mockResolvedValue({ results: [entity({ tempoWorklogId: '42', startDate: '2020-02-28', startTime: '09:30:00' })] })

        const result = await worklogs.addWorklog({ issueKeyOrAlias: 'ABC-123', durationOrInterval: '9-10' })

        expect(result.overlaps.map(it => it.id)).toEqual(['42'])
    })
})

describe('range', () => {
    test('sums logged and required time per day, only for the own account', async () => {
        ;(api.getWorklogs as jest.Mock).mockResolvedValue({
            results: [
                entity({ tempoWorklogId: '1', startDate: '2020-02-24', startTime: '13:00:00', timeSpentSeconds: 3600 }),
                entity({ tempoWorklogId: '2', startDate: '2020-02-24', startTime: '09:00:00', timeSpentSeconds: 7200 }),
                entity({ tempoWorklogId: '3', startDate: '2020-02-25', author: { accountId: 'someoneElse' } })
            ]
        })
        api.getUserSchedule = jest.fn().mockResolvedValue({
            results: [{ date: '2020-02-24', requiredSeconds: 28800, type: 'WORKING_DAY' }, { date: '2020-02-25', requiredSeconds: 28800, type: 'WORKING_DAY' }]
        })

        const result = await worklogs.getRangeWorklogs(parseRange('week', undefined, new Date('2020-02-28T12:00:00')))

        expect(result.days).toHaveLength(7)
        expect(result.days[0]).toMatchObject({ date: '2020-02-24', requiredSeconds: 28800, loggedSeconds: 10800 })
        expect(result.days[0].worklogs.map(it => it.id)).toEqual(['2', '1'])
        expect(result.days[0].worklogs[0].workType).toBe('Entwicklung')
        expect(result.days[1]).toMatchObject({ date: '2020-02-25', loggedSeconds: 0 })
        expect(api.getWorklogs).toHaveBeenCalledWith({ fromDate: '2020-02-24', toDate: '2020-03-01' })
    })
})
