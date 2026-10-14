import worklogs, { AddWorklogInput, EditWorklogInput, PreparedWorklog, Worklog, WorkTypes } from './worklogs/worklogs'
import { runSetup } from './setup'
import authenticator from './config/authenticator'
import { SkillTarget, customDirectory, installSkill, isForeignSkill, listInstallations, targetDirectory, uninstallSkill, updateInstallations } from './skill'
import { appVersion } from './version'
import * as worklogsTable from './worklogs/worklogsTable'
import chalk from 'chalk'
import { appName } from './appName'
import fs from 'fs'
import cliTruncate from 'cli-truncate'
import globalFlags from './globalFlags'
import { info, printJson, showError, startProgress, stopProgress, warn } from './output'
import { choose, confirm, isInteractive, prompt } from './terminal'
import { parseImport } from './worklogs/importParser'
import * as importTable from './worklogs/importTable'
import * as rangeTable from './worklogs/rangeTable'
import { DateRange } from './dates'
import configStore, { configFilePath } from './config/configStore'
import aliases from './config/aliases'
import trackers, {
    StartTrackerInput,
    PauseTrackerInput,
    StopTrackerInput,
    ResumeTrackerInput,
    DeleteTrackerInput
} from './trackers/trackers'
import { Tracker } from './config/trackerStore'
import * as trackersTable from './trackers/trackersTable'
import { lightFormat as fnsLightFormat, differenceInMinutes } from 'date-fns'
import { Interval } from 'date-fns'

export default {

    async setup() {
        await execute(async () => {
            await runSetup()
        })
    },

    async installSkill(target: SkillTarget | { dir: string } | undefined, yes = false) {
        await execute(async () => {
            let directory: string
            if (target === undefined) {
                if (!isInteractive()) throw Error('Choose where to install: --user, --project or --dir DIRECTORY.')
                const choices = [`For all your projects (${targetDirectory('user')})`, `For this project only (${targetDirectory('project')})`, 'In another skills directory']
                const index = await choose('Where should the skill go?', choices)
                directory = index === 0 ? targetDirectory('user') : index === 1 ? targetDirectory('project')
                    : customDirectory(await prompt('Skills directory'))
            } else {
                directory = typeof target === 'string' ? targetDirectory(target) : customDirectory(target.dir)
            }
            if (isForeignSkill(directory)) {
                await confirmOrThrow(`${directory} already holds a tempo skill that tempomat did not install. Replace it (a .bak copy is kept)?`, yes)
            }
            const result = await installSkill(directory)
            info(chalk.greenBright(`Installed the skill to ${result.file}.`) + (result.backup ? ` Your previous file is ${result.backup}.` : ''))
            info(`Use it in Claude Code with ${chalk.bold('/tempo')}. ${appName} update keeps it current.`)
        })
    },

    async updateSkills() {
        await execute(async () => {
            const result = await updateInstallations()
            if (result.updated.length === 0 && result.removed.length === 0) info(`No skill installed. Run ${appName} skill:install.`)
            result.updated.forEach(directory => info(`Updated ${directory}`))
            result.removed.forEach(directory => info(chalk.gray(`No longer tracking ${directory}: it was removed or replaced by your own file.`)))
        })
    },

    async uninstallSkills(directory?: string) {
        await execute(async () => {
            const targets = directory ? [customDirectory(directory)] : (await listInstallations()).map(it => it.directory)
            if (targets.length === 0) return info('No skill installed by tempomat.')
            for (const target of targets) {
                await uninstallSkill(target)
                info(`Removed ${target}`)
            }
        })
    },

    async showSkills() {
        await execute(async () => {
            const installations = await listInstallations()
            const current = appVersion()
            if (globalFlags.json) return printJson({ bundledVersion: current, installations })
            if (installations.length === 0) return info(`No skill installed. Run ${appName} skill:install.`)
            for (const installation of installations) {
                const state = !installation.exists ? chalk.redBright('missing')
                    : installation.installedVersion === current ? chalk.greenBright(`up to date (${current})`)
                        : installation.installedVersion ? chalk.yellow(`${installation.installedVersion}, ${appName} skill:update installs ${current}`)
                            : chalk.gray('replaced by your own file')
                console.log(`${installation.directory}  ${state}`)
            }
        })
    },

    async addWorklog(input: Omit<AddWorklogInput, 'issueKeyOrAlias'> & { issueKeyOrAlias?: string }): Promise<boolean> {
        return execute(async () => {
            const issueKeyOrAlias = input.issueKeyOrAlias ?? await pickRecentIssue()
            startProgress(globalFlags.dryRun ? 'Checking worklog' : 'Logging time')
            const result = await worklogs.addWorklog({ ...input, issueKeyOrAlias }, globalFlags.dryRun)
            stopProgress('Done.')
            if (globalFlags.json) return printJson({ dryRun: globalFlags.dryRun, ...result })
            if (globalFlags.dryRun) {
                console.log(`Would log ${describeWorklog(result.worklog)}. Nothing was sent.`)
            } else {
                console.log(chalk.greenBright(`Successfully logged ${result.worklog.duration} to ${result.worklog.issueKey}` +
                    `${result.worklog.workType ? ` as ${result.worklog.workType}` : ''}, ` +
                    `type ${chalk.bold(`${appName} undo`)} or ${chalk.bold(`${appName} d ${result.worklog.id}`)} to undo.`))
            }
            showOverlaps(result.overlaps)
        })
    },

    async editWorklog(input: EditWorklogInput) {
        await execute(async () => {
            startProgress(globalFlags.dryRun ? 'Checking changes' : `Updating worklog ${input.worklogId}`)
            const result = await worklogs.editWorklog(input, globalFlags.dryRun)
            stopProgress('Done.')
            if (globalFlags.json) return printJson({ dryRun: globalFlags.dryRun, ...result })
            console.log(`Before: ${describeWorklog(result.before)}`)
            console.log(`After:  ${describeWorklog(result.after)}`)
            if (globalFlags.dryRun) {
                console.log('Nothing was sent.')
            } else {
                const moved = result.after.id !== result.before.id ? ` It moved to a new id ${chalk.yellow(result.after.id)}.` : ''
                console.log(chalk.greenBright(`Updated worklog.${moved} Type ${chalk.bold(`${appName} undo`)} to revert.`))
            }
        })
    },

    async copyWorklog(worklogId: string, when?: string, startTime?: string) {
        await execute(async () => {
            startProgress(globalFlags.dryRun ? 'Checking copy' : `Copying worklog ${worklogId}`)
            const result = await worklogs.copyWorklog(worklogId, when, startTime, globalFlags.dryRun)
            stopProgress('Done.')
            if (globalFlags.json) return printJson({ dryRun: globalFlags.dryRun, ...result })
            if (globalFlags.dryRun) {
                console.log(`Would log ${describeWorklog(result.worklog)}. Nothing was sent.`)
            } else {
                console.log(chalk.greenBright(`Logged copy ${chalk.yellow(result.worklog.id)}: ${describeWorklog(result.worklog)}`))
            }
            showOverlaps(result.overlaps)
        })
    },

    async deleteWorklogs(worklogsIds: string[], yes = false) {
        await execute(async () => {
            startProgress('Loading worklogs')
            const toDelete = []
            for (const worklogId of worklogsIds) toDelete.push(await worklogs.getWorklog(worklogId))
            stopProgress('Done.')
            if (!globalFlags.json) {
                console.log(`${globalFlags.dryRun ? 'Would delete' : 'Deleting'}:`)
                toDelete.forEach(worklog => console.log(`  ${chalk.yellow(worklog.id)}  ${describeWorklog(worklog)}`))
            }
            if (globalFlags.dryRun) {
                if (globalFlags.json) printJson({ dryRun: true, deleted: toDelete })
                else console.log('Nothing was sent.')
                return
            }
            await confirmOrThrow(`Delete ${toDelete.length === 1 ? 'this worklog' : `these ${toDelete.length} worklogs`}?`, yes)
            const deleted = []
            for (const worklog of toDelete) {
                startProgress(`Deleting worklog ${worklog.id}`)
                deleted.push(await worklogs.deleteWorklog(worklog.id))
                stopProgress('Done.')
            }
            if (globalFlags.json) return printJson({ dryRun: false, deleted })
            console.log(chalk.greenBright(`Deleted ${deleted.map(it => it.id).join(', ')}.`) +
                (deleted.length === 1 ? ` Type ${chalk.bold(`${appName} undo`)} to restore it.` : ` ${appName} undo restores the last one.`))
        })
    },

    async undo(yes = false) {
        await execute(async () => {
            const plan = await worklogs.undo(true)
            if (!globalFlags.json) console.log(`Undo will ${plan.description}.`)
            if (globalFlags.dryRun) {
                if (globalFlags.json) printJson({ dryRun: true, ...plan })
                return
            }
            await confirmOrThrow('Undo?', yes)
            startProgress('Undoing')
            const result = await worklogs.undo()
            stopProgress('Done.')
            if (globalFlags.json) printJson({ dryRun: false, ...result })
        })
    },

    async importWorklogs(source: string, yes = false) {
        await execute(async () => {
            const content = source === '-' ? await readStdin() : await fs.promises.readFile(source, 'utf8')
            const lines = parseImport(content)
            if (lines.length === 0) throw Error('No worklogs found. Write one per line, like: ABC-123 1h30m 2026-10-13 -s 9 -d "text"')
            startProgress(`Checking ${lines.length} worklogs`)
            const workTypes = new WorkTypes()
            const prepared: PreparedWorklog[] = []
            for (const line of lines) {
                try {
                    prepared.push(await worklogs.prepareWorklog(line.input, workTypes))
                } catch (e) {
                    throw Error(`Line ${line.lineNumber} (${line.text}): ${(e as Error).message}`)
                }
            }
            stopProgress('Done.')
            if (!globalFlags.json) {
                console.log(importTable.render(prepared.map(it => it.preview)).toString())
            }
            if (globalFlags.dryRun) {
                if (globalFlags.json) printJson({ dryRun: true, worklogs: prepared.map(it => it.preview) })
                else console.log('Nothing was sent.')
                return
            }
            await confirmOrThrow(`Log these ${prepared.length} worklogs?`, yes)
            const logged: Worklog[] = []
            try {
                for (const item of prepared) {
                    startProgress(`Logging ${item.preview.issueKey} ${item.preview.date} ${item.preview.duration}`)
                    logged.push(await worklogs.sendWorklog(item))
                    stopProgress('Done.')
                }
            } catch (e) {
                await worklogs.recordImport(logged.map(it => it.id))
                const done = logged.length ? ` Logged before the failure: ${logged.map(it => it.id).join(', ')} (${appName} undo removes them).` : ' Nothing was logged.'
                throw Error(`Stopped at worklog ${logged.length + 1} of ${prepared.length}: ${(e as Error).message}.${done}`)
            }
            await worklogs.recordImport(logged.map(it => it.id))
            if (globalFlags.json) return printJson({ dryRun: false, worklogs: logged })
            console.log(chalk.greenBright(`Logged ${logged.length} worklogs. Type ${chalk.bold(`${appName} undo`)} to remove all of them.`))
        })
    },

    async listUserWorklogs(when?: string, verbose = false) {
        await execute(async () => {
            startProgress('Loading worklogs')
            const userWorklogs = await worklogs.getUserWorklogs(when)
            stopProgress('Done.')
            if (globalFlags.json) return printJson(userWorklogs)
            const table = await worklogsTable.render(userWorklogs, verbose)
            console.log(table.toString())
        })
    },

    async listRange(range: () => DateRange, verbose = false) {
        await execute(async () => {
            startProgress('Loading worklogs')
            const rangeWorklogs = await worklogs.getRangeWorklogs(range())
            stopProgress('Done.')
            if (globalFlags.json) return printJson(rangeWorklogs)
            console.log(rangeTable.render(rangeWorklogs, verbose))
        })
    },

    async setAlias(aliasName: string, issueKey: string, workType?: string) {
        await execute(async () => {
            const canonicalWorkType = workType ? await canonicalWorkTypeName(workType) : undefined
            await aliases.set(aliasName, issueKey, canonicalWorkType)
            info(`${aliasName} => ${issueKey.toUpperCase()}${canonicalWorkType ? ` (${canonicalWorkType})` : ''}`)
        })
    },

    async deleteAlias(aliasName: string) {
        await execute(async () => {
            await aliases.delete(aliasName)
        })
    },

    async listAliases() {
        await execute(async () => {
            const all = await aliases.all()
            const entries = await Promise.all([...(all ?? new Map()).entries()]
                .map(async ([name, issueKey]) => ({ name, issueKey, workType: await aliases.getWorkType(name) })))
            if (globalFlags.json) return printJson(entries)
            entries.forEach(entry => console.log(`${entry.name} => ${entry.issueKey}${entry.workType ? ` (${entry.workType})` : ''}`))
        })
    },

    async listWorkAttributes() {
        await execute(async () => {
            const attributes = await worklogs.getWorkAttributes()
            if (globalFlags.json) return printJson(attributes)
            const defaultWorkType = (await configStore.read()).defaultWorkType
            for (const attribute of attributes) {
                const required = attribute.required ? ', required' : ''
                console.log(chalk.bold(`${attribute.name} (${attribute.key}, ${attribute.type}${required})`))
                for (const value of attribute.values ?? []) {
                    const name = attribute.names?.[value] ?? value
                    const isDefault = attribute.key === '_WorkType_' && name === defaultWorkType
                    console.log(`  ${name}${isDefault ? chalk.gray(' (default)') : ''}`)
                }
            }
        })
    },

    async showConfig() {
        await execute(async () => {
            const config = await configStore.read()
            const settings = {
                hostname: config.hostname,
                atlassianUserEmail: config.atlassianUserEmail,
                accountId: config.accountId,
                tokens: config.tokenStorage === 'keychain' ? `in the ${await authenticator.keychainName()}`
                    : config.tempoToken || config.atlassianToken ? 'in the config file' : 'not set',
                workType: config.defaultWorkType,
                skillInstallations: config.skillInstallations ?? [],
                configFile: configFilePath()
            }
            if (globalFlags.json) return printJson(settings)
            for (const [key, value] of Object.entries(settings)) {
                const shown = Array.isArray(value) ? (value.length ? value.join(', ') : '-') : (value ?? '-')
                console.log(`${chalk.bold(key.padEnd(20))} ${shown}`)
            }
        })
    },

    async setConfig(key: string, value: string) {
        await execute(async () => {
            if (key === 'token-storage') {
                if (value !== 'keychain' && value !== 'file') throw Error('token-storage is keychain or file.')
                if (value === 'keychain' && !await authenticator.keychainAvailable()) {
                    throw Error('No usable keychain found. On Linux, install libsecret-tools and run a keyring such as GNOME Keyring or KWallet.')
                }
                await authenticator.saveCredentials(await authenticator.getCredentials(), value)
                return info(value === 'keychain' ? `Moved your tokens to the ${await authenticator.keychainName()}.` : 'Moved your tokens to the config file.')
            }
            if (key !== 'work-type') throw Error(`Unknown setting "${key}". Available: work-type, token-storage`)
            const name = await canonicalWorkTypeName(value)
            const config = await configStore.read()
            config.defaultWorkType = name
            await configStore.save(config)
            info(`Default work type is now ${name}.`)
        })
    },

    async unsetConfig(key: string) {
        await execute(async () => {
            if (key !== 'work-type') throw Error(`Unknown setting "${key}". Available: work-type`)
            const config = await configStore.read()
            delete config.defaultWorkType
            await configStore.save(config)
            info('Removed the default work type.')
        })
    },

    async startTracker(input: StartTrackerInput) {
        await execute(async () => {
            let tracker = await trackers.findTracker(input.issueKeyOrAlias)
            if (input.stopPreviousTracker && tracker) {
                await this.stopTracker({
                    issueKeyOrAlias: input.issueKeyOrAlias,
                    now: input.now
                })
            }

            tracker = await trackers.startTracker(input)
            if (!tracker) throw Error(`Tracker for ${input.issueKeyOrAlias} already exists.`)
            console.log(`Started tracker for ${tracker.issueKey}.`)
        })
    },

    async resumeTracker(input: ResumeTrackerInput) {
        await execute(async () => {
            const tracker = await trackers.resumeTracker(input)
            if (!tracker) throw Error(`Tracker for ${input.issueKeyOrAlias} does not exist.`)
            console.log(`Resumed tracker for ${tracker.issueKey}.`)
        })
    },

    async pauseTracker(input: PauseTrackerInput) {
        await execute(async () => {
            const tracker = await trackers.pauseTracker(input)
            if (!tracker) throw Error(`Tracker for ${input.issueKeyOrAlias} does not exist.`)
            console.log(`Paused tracker for ${tracker.issueKey}.`)
        })
    },

    async stopTracker(input: StopTrackerInput) {
        await execute(async () => {
            let tracker = await trackers.stopTracker(input)
            if (!tracker) throw Error(`Tracker for ${input.issueKeyOrAlias} does not exist.`)

            const intervalsWithInputs = createWorklogInputs(tracker, input.remainingEstimate, input.workType)
            if (intervalsWithInputs.length === 0) {
                console.log('There are no intervals with minimal length of 0 minutes.')
                await trackers.deleteTracker({ issueKeyOrAlias: tracker.issueKey })
                return
            }

            console.log('Logging tracker intervals')
            let allSucceeded = true
            for (const intervalWithInput of intervalsWithInputs) {
                const interval = intervalWithInput[0]
                const input = intervalWithInput[1]
                if (await this.addWorklog(input)) {
                    tracker = await trackers.removeInterval(tracker, interval)
                } else {
                    allSucceeded = false
                }
            }

            if (!allSucceeded) throw Error('Failed to log some parts of the tracker. They are kept in the tracker; fix the error and stop it again.')

            await trackers.deleteTracker({ issueKeyOrAlias: tracker.issueKey })
            console.log(chalk.greenBright('Logged all worklogs.'))
        })
    },

    async deleteTracker(input: DeleteTrackerInput) {
        await execute(async () => {
            const tracker = await trackers.deleteTracker(input)
            if (!tracker) throw Error(`Tracker for ${input.issueKeyOrAlias} does not exist.`)
            console.log(`Deleted tracker for ${tracker.issueKey}.`)
        })
    },

    async listTrackers(now: Date) {
        await execute(async () => {
            const userTrackers = await trackers.getTrackers()
            if (globalFlags.json) return printJson(userTrackers)
            for (const tracker of userTrackers) {
                const table = await trackersTable.render(tracker, now)
                console.log(table.toString())
            }
        })
    }
}

async function execute(action: () => Promise<void>): Promise<boolean> {
    try {
        await action()
        return true
    } catch (e) {
        showError(e as Error)
        return false
    }
}

function describeWorklog(worklog: Worklog): string {
    const interval = worklog.interval ? `${worklog.interval.startTime}-${worklog.interval.endTime}` : ''
    const details = [worklog.workType, worklog.description ? `"${worklog.description}"` : ''].filter(Boolean).join(', ')
    return `${worklog.issueKey} ${worklog.date} ${interval} (${worklog.duration})${details ? ` ${details}` : ''}`
}

function showOverlaps(overlaps: Worklog[]) {
    if (overlaps.length === 0) return
    warn(`Overlaps with: ${overlaps.map(it => `${it.id} ${it.issueKey} ${it.interval?.startTime}-${it.interval?.endTime}`).join('; ')}`)
}

async function pickRecentIssue(): Promise<string> {
    if (!isInteractive() || globalFlags.json) throw Error('Give an issue key or alias, e.g. tempo l ABC-123 1h.')
    startProgress('Loading your recent issues')
    const issues = await worklogs.getRecentIssues()
    stopProgress('Done.')
    const allAliases = [...((await aliases.all()) ?? new Map()).entries()]
    const choices = [
        ...issues.map(issue => `${chalk.bold(issue.key.padEnd(14))} ${cliTruncate(issue.summary, 60)}`),
        ...allAliases.map(([name, issueKey]) => `${chalk.bold(name.padEnd(14))} ${chalk.gray(`alias for ${issueKey}`)}`)
    ]
    if (choices.length === 0) throw Error('No recent issues or aliases. Give an issue key, e.g. tempo l ABC-123 1h.')
    const index = await choose('Log to which issue?', choices)
    return index < issues.length ? issues[index].key : allAliases[index - issues.length][0]
}

async function confirmOrThrow(question: string, yes: boolean) {
    if (yes) return
    if (!isInteractive() || globalFlags.json) throw Error('Confirmation needed. Run again with -y to confirm.')
    if (!await confirm(question)) throw Error('Cancelled. Nothing was changed.')
}

async function canonicalWorkTypeName(workType: string): Promise<string> {
    const workTypes = new WorkTypes()
    const attribute = await workTypes.resolve(workType)
    return workTypes.nameOf(attribute.value)
}

async function readStdin(): Promise<string> {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
    return Buffer.concat(chunks).toString('utf8')
}

function createWorklogInputs(tracker: Tracker, remainingEstimate?: string, workType?: string): [Interval, AddWorklogInput][] {
    return tracker.intervals.map(interval => {
        return [
            interval,
            {
                issueKeyOrAlias: tracker.issueKey,
                description: tracker.description,
                when: fnsLightFormat(interval.start, 'yyyy-MM-dd'),
                startTime: fnsLightFormat(interval.start, 'HH:mm'),
                durationOrInterval: `${differenceInMinutes(interval.end, interval.start)}m`,
                remainingEstimate: remainingEstimate,
                workType: workType
            }
        ]
    })
}
