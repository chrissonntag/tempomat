import authenticator from '../config/authenticator'
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import tempoAxios, { tempoBaseUrl } from './tempoAxios'
import flags from '../globalFlags'
import { appName } from '../appName'
import atlassianAxios from './atlassianAxios'

export type AddWorklogRequest = {
    issueId: string;
    timeSpentSeconds: number;
    startDate: string;
    startTime: string;
    description?: string;
    remainingEstimateSeconds?: number;
    attributes?: WorkAttributeValue[]
}

export type WorkAttributeValue = {
    key: string;
    value: string;
}

export type WorkAttributeEntity = {
    key: string;
    name: string;
    type: string;
    required: boolean;
    values?: string[];
    names?: Record<string, string>;
}

export type GetWorklogsRequest = {
    fromDate: string;
    toDate: string;
}

export type GetUserScheduleRequest = {
    fromDate: string;
    toDate: string;
}

export type GetUserScheduleResponse = {
    results: ScheduleEntity[];
}

export type ScheduleEntity = {
    date: string;
    requiredSeconds: number;
    type: string;
}

export type GetWorklogsResponse = {
    results: WorklogEntity[];
}

export type WorklogEntity = {
    tempoWorklogId: string;
    startDate: string;
    startTime: string;
    author: AuthorEntity;
    issue: IssueEntity;
    description: string;
    timeSpentSeconds: number;
    billableSeconds?: number;
    attributes?: { values?: WorkAttributeValue[] };
}

export type UpdateWorklogRequest = {
    timeSpentSeconds: number;
    startDate: string;
    startTime: string;
    description?: string;
    billableSeconds?: number;
    remainingEstimateSeconds?: number;
    attributes?: WorkAttributeValue[];
}

export type AtlassianUser = {
    accountId: string;
    displayName: string;
    emailAddress?: string;
}

export type IssueSummary = {
    id: string;
    key: string;
    summary: string;
}

export type AuthorEntity = {
    accountId: string;
}

export type IssueEntity = {
    self: string;
    id: string;
}

type TempoApiErrorResponse = {
    errors: Array<{ message: string }>;
}

type AtlassianApiErrorResponse = {
    errorMessages: string[];
}

export default {

    async addWorklog(request: AddWorklogRequest): Promise<WorklogEntity> {
        const credentials = await authenticator.getCredentials()
        const body = { ...request, authorAccountId: credentials.accountId }
        return execute(async () => {
            const response = await tempoAxios.post('/worklogs', body)
            debugLog(response)
            return response.data
        })
    },

    async deleteWorklog(worklogId: number) {
        return execute(async () => {
            const response = await tempoAxios.delete(`/worklogs/${worklogId}`)
            debugLog(response)
        })
    },

    async updateWorklog(worklogId: number, request: UpdateWorklogRequest): Promise<WorklogEntity> {
        const credentials = await authenticator.getCredentials()
        const body = { ...request, authorAccountId: credentials.accountId }
        return execute(async () => {
            const response = await tempoAxios.put(`/worklogs/${worklogId}`, body)
            debugLog(response)
            return response.data
        })
    },

    async getWorklog(worklogId: number): Promise<WorklogEntity> {
        return execute(async () => {
            const response = await tempoAxios.get(`/worklogs/${worklogId}`)
            debugLog(response)
            return response.data
        })
    },

    async getWorklogs(request: GetWorklogsRequest): Promise<GetWorklogsResponse> {
        const credentials = await authenticator.getCredentials()
        return execute(async () => {
            const response = await tempoAxios.get(`/worklogs/user/${credentials.accountId}`, {
                params: { from: request.fromDate, to: request.toDate, limit: 1000 }
            })
            debugLog(response)
            const allResults = await fetchPaginatedResults<WorklogEntity>(response.data.results, response)
            return { results: allResults }
        })
    },

    async getUserSchedule(request: GetUserScheduleRequest): Promise<GetUserScheduleResponse> {
        return execute(async () => {
            const response = await tempoAxios.get('/user-schedule', {
                params: { from: request.fromDate, to: request.toDate }
            })
            debugLog(response)
            return {
                results: response.data.results
            }
        })
    },

    async getWorkAttributes(): Promise<WorkAttributeEntity[]> {
        return execute(async () => {
            const response = await tempoAxios.get('/work-attributes', { params: { limit: 1000 } })
            debugLog(response)
            return fetchPaginatedResults<WorkAttributeEntity>(response.data.results, response)
        })
    },

    async getIssueId(issueKey: string): Promise<string> {
        const path = `/issue/${encodeURIComponent(validIssueKey(issueKey))}`
        return execute(async () => {
            const response = await atlassianAxios.get(path)
            debugLog(response)
            return response.data.id
        })
    },

    async getIssueSummaries(issueIds: string[]): Promise<IssueSummary[]> {
        if (issueIds.length === 0) return []
        const ids = issueIds.map(validIssueId)
        return execute(async () => {
            const response = await atlassianAxios.post('/search/jql', {
                jql: `id in (${ids.join(',')})`,
                fields: ['summary'],
                maxResults: ids.length
            })
            debugLog(response)
            return response.data.issues.map((issue: { id: string, key: string, fields: { summary: string } }) => ({
                id: String(issue.id),
                key: issue.key,
                summary: issue.fields.summary.trim()
            }))
        })
    },

    async verifyAtlassianCredentials(hostname: string, email: string, token: string): Promise<AtlassianUser> {
        const authString = Buffer.from(`${email}:${token}`).toString('base64')
        return execute(async () => {
            const response = await axios.get(`https://${hostname}/rest/api/3/myself`, {
                headers: { Authorization: `Basic ${authString}`, Accept: 'application/json' },
                maxRedirects: 0
            })
            debugLog(response)
            return response.data
        })
    },

    async verifyTempoToken(token: string): Promise<WorkAttributeEntity[]> {
        return execute(async () => {
            const response = await axios.get(`${tempoBaseUrl}/work-attributes`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit: 1000 },
                maxRedirects: 0
            })
            debugLog(response)
            return response.data.results
        })
    },

    async getIssueKey(issueId: string): Promise<string> {
        const path = `/issue/${encodeURIComponent(validIssueId(issueId))}`
        return execute(async () => {
            const response = await atlassianAxios.get(path)
            debugLog(response)
            return response.data.key
        })
    }
}

async function fetchPaginatedResults<T>(acc: T[], response: AxiosResponse): Promise<T[]> {
    const nextPageUrl = response.data.metadata.next
    if (nextPageUrl) {
        const response = await tempoAxios.get(validTempoUrl(nextPageUrl))
        debugLog(response)
        const nextPageResults = await fetchPaginatedResults<T>(response.data.results, response)
        return acc.concat(nextPageResults)
    } else {
        return acc
    }
}

function validIssueKey(issueKey: string): string {
    if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(issueKey)) throw Error(`Invalid issue key: ${issueKey}`)
    return issueKey
}

function validIssueId(issueId: string): string {
    if (!/^\d+$/.test(String(issueId))) throw Error(`Invalid issue id: ${issueId}`)
    return String(issueId)
}

const TEMPO_ORIGINS = ['https://api.tempo.io', 'https://api.eu.tempo.io', 'https://api.us.tempo.io']

function validTempoUrl(url: string): string {
    const parsed = new URL(url, tempoBaseUrl)
    if (!TEMPO_ORIGINS.includes(parsed.origin)) throw Error(`Refusing to follow pagination link to ${parsed.origin}`)
    return parsed.href
}

function describeRequest(config?: InternalAxiosRequestConfig): string {
    const url = config?.url ?? ''
    const fullUrl = /^https?:\/\//.test(url) ? url : `${config?.baseURL ?? ''}${url}`
    return `${config?.method?.toUpperCase()} ${fullUrl}`
}

function debugLog(response: AxiosResponse) {
    if (flags.debug) {
        console.log(`Request: ${describeRequest(response.config)}, Response: ${JSON.stringify(response.data)}`)
    }
}

async function execute<T>(action: () => Promise<T>): Promise<T> {
    return action().catch((e) => handleError(e))
}

function handleError(e: AxiosError): never {
    if (!axios.isAxiosError(e)) throw e
    if (flags.debug) console.log(`Response: ${JSON.stringify(e.response?.data)}`)
    const responseStatus = e.response?.status
    if (responseStatus === 401) {
        throw Error(`Unauthorized access. Tokens are invalid or have expired. Run ${appName} setup to configure access.`)
    }

    const errorMessages = (e.response?.data as AtlassianApiErrorResponse)?.errorMessages
    if (Array.isArray(errorMessages)) {
        if (errorMessages) {
            throw Error(`Failure (Atlassian API). Reason: ${e.message}. Errors: ${errorMessages.join(', ')}`)
        }
    }

    const errors = (e.response?.data as TempoApiErrorResponse)?.errors
    if (Array.isArray(errors)) {
        const errorMessages = errors.map((err: { message?: string }) => err.message)
        if (errorMessages) {
            throw Error(`Failure (Tempo API). Reason: ${e.message}. Errors: ${errorMessages.join(', ')}`)
        }
    }

    if (flags.debug) {
        console.log(`Request: ${describeRequest(e.config)}, Error: ${e.code ?? ''} ${e.message}`)
    }
    let errorMessage = 'Error connecting to server.'
    if (responseStatus) errorMessage += ` Server status code: ${responseStatus}.`
    throw Error(errorMessage)
}
