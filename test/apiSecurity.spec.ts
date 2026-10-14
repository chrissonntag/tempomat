import { AxiosError, InternalAxiosRequestConfig } from 'axios'
import api from '../src/api/api'
import tempoAxios from '../src/api/tempoAxios'
import atlassianAxios from '../src/api/atlassianAxios'
import flags from '../src/globalFlags'
import { fakeCredentials } from './mocks/fakeCredentials'

jest.mock('../src/config/configStore', () => jest.requireActual('./mocks/configStore'))

fakeCredentials()

const requests: InternalAxiosRequestConfig[] = []

function respondWith(...responses: unknown[]) {
    const adapter = async (config: InternalAxiosRequestConfig) => {
        requests.push(config)
        return { data: responses[requests.length - 1], status: 200, statusText: 'OK', headers: {}, config }
    }
    tempoAxios.defaults.adapter = adapter
    atlassianAxios.defaults.adapter = adapter
}

function loggedText(log: jest.SpyInstance): string {
    return log.mock.calls.flat().map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)).join('\n')
}

afterEach(() => {
    requests.length = 0
    flags.debug = false
    jest.restoreAllMocks()
})

describe('debug output', () => {
    test('does not print the Tempo token', async () => {
        respondWith({ results: [], metadata: {} })
        flags.debug = true
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)

        await api.getWorklogs({ fromDate: '2020-02-01', toDate: '2020-02-02' })

        expect(requests[0].headers.Authorization).toBe('Bearer fakeToken')
        const output = loggedText(log)
        expect(output).toContain('GET https://api.tempo.io/4/worklogs/user/fakeAccountId')
        expect(output).not.toContain('fakeToken')
    })

    test('does not print the Atlassian credentials', async () => {
        respondWith({ id: '10001' })
        flags.debug = true
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)

        await api.getIssueId('ABC-1')

        const basicAuth = Buffer.from('fakeUserEmail:fakeToken').toString('base64')
        expect(requests[0].headers.Authorization).toBe(`Basic ${basicAuth}`)
        const output = loggedText(log)
        expect(output).not.toContain(basicAuth)
        expect(output).not.toContain('fakeToken')
    })

    test('does not print credentials of failed requests', async () => {
        tempoAxios.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
            const response = { data: {}, status: 500, statusText: 'Error', headers: {}, config }
            throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response)
        }
        flags.debug = true
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)

        await expect(api.deleteWorklog(1)).rejects.toThrow('Server status code: 500.')

        expect(loggedText(log)).not.toContain('fakeToken')
    })
})

describe('issue lookups', () => {
    test.each(['../../../rest/api/3/myself?x=', 'ABC-1?expand=x', 'ABC-1#x', 'abc-1', 'ABC', ''])(
        'rejects issue key %p without sending a request', async (issueKey) => {
            respondWith({ id: '10001' })

            await expect(api.getIssueId(issueKey)).rejects.toThrow('Invalid issue key')

            expect(requests).toHaveLength(0)
        })

    test.each(['../myself', '123abc', '1/2', ''])(
        'rejects issue id %p without sending a request', async (issueId) => {
            respondWith({ key: 'ABC-1' })

            await expect(api.getIssueKey(issueId)).rejects.toThrow('Invalid issue id')

            expect(requests).toHaveLength(0)
        })

    test('looks up a valid issue key', async () => {
        respondWith({ id: '10001' })

        expect(await api.getIssueId('AB_C2-123')).toBe('10001')

        expect(requests[0].url).toBe('/issue/AB_C2-123')
    })
})

describe('worklog pagination', () => {
    test('follows next links on api.tempo.io', async () => {
        respondWith(
            { results: ['a'], metadata: { next: 'https://api.tempo.io/4/worklogs/user/fakeAccountId?offset=1' } },
            { results: ['b'], metadata: {} })

        const response = await api.getWorklogs({ fromDate: '2020-02-01', toDate: '2020-02-02' })

        expect(response.results).toEqual(['a', 'b'])
        expect(requests[1].url).toBe('https://api.tempo.io/4/worklogs/user/fakeAccountId?offset=1')
    })

    test('follows next links on the regional Tempo hosts', async () => {
        respondWith(
            { results: ['a'], metadata: { next: 'https://api.eu.tempo.io/4/work-attributes?offset=1' } },
            { results: ['b'], metadata: {} })

        expect(await api.getWorkAttributes()).toEqual(['a', 'b'])
        expect(requests[1].url).toBe('https://api.eu.tempo.io/4/work-attributes?offset=1')
    })

    test('does not send the Tempo token to a foreign next link', async () => {
        respondWith({ results: ['a'], metadata: { next: 'https://attacker.example/steal' } })

        await expect(api.getWorklogs({ fromDate: '2020-02-01', toDate: '2020-02-02' }))
            .rejects.toThrow('Refusing to follow pagination link to https://attacker.example')

        expect(requests).toHaveLength(1)
    })
})
