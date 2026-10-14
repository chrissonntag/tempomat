import chalk from 'chalk'
import os from 'os'
import path from 'path'
import api, { WorkAttributeEntity } from './api/api'
import authenticator, { TokenStorage } from './config/authenticator'
import configStore, { configFilePath } from './config/configStore'
import { appName } from './appName'
import { choose, confirm, isInteractive, openUrl, prompt } from './terminal'
import { customDirectory, installSkill, isForeignSkill, targetDirectory } from './skill'

const ATLASSIAN_TOKEN_URL = 'https://id.atlassian.com/manage-profile/security/api-tokens'
const TOTAL_STEPS = 5

type Account = {
    hostname: string
    email: string
    atlassianToken: string
    accountId: string
    displayName: string
}

export async function runSetup() {
    if (!isInteractive()) throw Error(`${appName} setup asks for your tokens and needs an interactive terminal.`)
    const config = await configStore.read()

    console.log(chalk.bold(`\nSet up ${appName}`))
    console.log(chalk.gray('Connects the CLI to your Jira and Tempo accounts. Press Enter to keep a value shown in [brackets].'))

    const account = await askAtlassianAccount(config.hostname, config.atlassianUserEmail, config.atlassianToken)
    const { tempoToken, attributes } = await askTempoToken(account.hostname, config.tempoToken)
    const workType = await askWorkType(attributes, config.defaultWorkType)
    const storage = await askTokenStorage(config.tokenStorage)

    await authenticator.saveCredentials({
        hostname: account.hostname,
        atlassianUserEmail: account.email,
        atlassianToken: account.atlassianToken,
        accountId: account.accountId,
        tempoToken: tempoToken
    }, storage)
    const saved = await configStore.read()
    if (workType) saved.defaultWorkType = workType
    await configStore.save(saved)
    success(storage === 'keychain'
        ? `Saved your tokens in the ${await authenticator.keychainName()} and your settings to ${configFilePath()}`
        : `Saved to ${configFilePath()}, readable only by you`)

    await offerSkill()
    printNextSteps()
}

async function askAtlassianAccount(hostname?: string, email?: string, token?: string): Promise<Account> {
    for (;;) {
        const site = await askHostname(hostname)
        const userEmail = await askEmail(email)
        const atlassianToken = await askSecret(3, 'Atlassian API token', `Create one at ${ATLASSIAN_TOKEN_URL}`, ATLASSIAN_TOKEN_URL, token)
        try {
            const user = await api.verifyAtlassianCredentials(site, userEmail, atlassianToken)
            success(`Signed in to Jira as ${chalk.bold(user.displayName)} ${chalk.gray(`(account ${user.accountId})`)}`)
            return { hostname: site, email: userEmail, atlassianToken, accountId: user.accountId, displayName: user.displayName }
        } catch (e) {
            const message = (e as Error).message
            failure(message.startsWith('Error connecting to server') && !/status code/.test(message)
                ? `Could not reach ${site}.`
                : `Jira did not accept these details: ${message.replace(/ Run tempo setup.*$/, '')}`)
            console.log(chalk.gray('Check the site, email and token, then try again.'))
            hostname = site
            email = userEmail
            token = undefined
        }
    }
}

async function askHostname(current?: string): Promise<string> {
    step(1, 'Atlassian site', 'Your Jira address, e.g. yourcompany.atlassian.net')
    for (;;) {
        const input = await ask(current)
        try {
            const hostname = extractHostname(input)
            if (!hostname.endsWith('.atlassian.net')) {
                console.log(chalk.yellow(`${hostname} is not an atlassian.net address. Your email and token will be sent to it.`))
                if (!await confirm('Use it anyway?')) continue
            }
            return hostname
        } catch {
            failure('That is not a valid address. Enter something like yourcompany.atlassian.net.')
        }
    }
}

async function askEmail(current?: string): Promise<string> {
    step(2, 'Atlassian account', 'The email address you log in to Jira with')
    for (;;) {
        const email = await ask(current)
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return email
        failure('That does not look like an email address.')
    }
}

async function askTempoToken(hostname: string, current?: string): Promise<{ tempoToken: string, attributes: WorkAttributeEntity[] }> {
    const url = `https://${hostname}/plugins/servlet/ac/io.tempo.jira/tempo-app#!/configuration/api-integration`
    for (;;) {
        const tempoToken = await askSecret(4, 'Tempo API token', `Create one in Tempo under Settings › API integration: ${url}`, url, current)
        try {
            const attributes = await api.verifyTempoToken(tempoToken)
            success('Connected to Tempo')
            return { tempoToken, attributes }
        } catch (e) {
            failure(`Tempo did not accept the token: ${(e as Error).message.replace(/ Run tempo setup.*$/, '')}`)
            current = undefined
        }
    }
}

async function askWorkType(attributes: WorkAttributeEntity[], current?: string): Promise<string | undefined> {
    const workType = attributes.find(it => it.key === '_WorkType_')
    const names = (workType?.values ?? []).map(value => workType?.names?.[value] ?? value)
    if (names.length === 0) {
        step(5, 'Default work type', 'Your Tempo has no work types, nothing to choose.')
        return undefined
    }
    const required = workType?.required ? 'Tempo requires one on every worklog. ' : ''
    step(5, 'Default work type', `${required}Used whenever you log without -w; change it later with ${appName} config:set work-type.`)
    const currentIndex = current ? names.findIndex(it => it === current) : -1
    const index = await choose(chalk.cyan('›'), names, currentIndex >= 0 ? currentIndex : undefined)
    return names[index]
}

async function askTokenStorage(current?: TokenStorage): Promise<TokenStorage> {
    if (!await authenticator.keychainAvailable()) return 'file'
    console.log(`\n${chalk.bold('Where should your tokens be kept?')}`)
    const choices = [
        `In the ${await authenticator.keychainName()} ${chalk.gray('(recommended)')}`,
        `In ${tildify(configFilePath())} ${chalk.gray('(plain text, readable only by you)')}`
    ]
    const index = await choose(chalk.cyan('›'), choices, current === 'file' ? 1 : 0)
    return index === 0 ? 'keychain' : 'file'
}

async function offerSkill() {
    console.log(`\n${chalk.bold('Claude Code skill')} ${chalk.gray('(optional)')}`)
    console.log(chalk.gray(`Lets Claude Code log and review your time when you type /tempo. ${appName} update keeps it current.`))
    const choices = [
        `For all your projects ${chalk.gray(tildify(targetDirectory('user')))}`,
        `For this project only ${chalk.gray(tildify(targetDirectory('project')))}`,
        'In another skills directory',
        'Skip'
    ]
    const index = await choose(chalk.cyan('›'), choices, 3)
    if (index === 3) return
    const directory = index === 0 ? targetDirectory('user')
        : index === 1 ? targetDirectory('project')
            : customDirectory(await prompt(chalk.cyan('Skills directory › '), { raw: true }))
    if (isForeignSkill(directory) && !await confirm(`${tildify(directory)} already holds a tempo skill you wrote. Replace it (a .bak copy is kept)?`)) {
        console.log(chalk.gray('Skipped the skill.'))
        return
    }
    const result = await installSkill(directory)
    success(`Installed the skill to ${tildify(result.file)}${result.backup ? `, your previous file is ${tildify(result.backup)}` : ''}`)
}

function printNextSteps() {
    console.log(`\n${chalk.bold('You are ready.')} Try:`)
    console.log(`  ${chalk.cyan(`${appName} ls`)}                 today's worklogs`)
    console.log(`  ${chalk.cyan(`${appName} ls week last`)}       last week`)
    console.log(`  ${chalk.cyan(`${appName} l ABC-123 1h -s 9`)}  log an hour from 9:00`)
    console.log(`  ${chalk.cyan(`${appName} --help`)}             all commands`)
    const shortcuts = shellShortcuts()
    if (shortcuts) {
        console.log(chalk.gray(`\nShorter commands: add these lines to ${shortcuts.file}`))
        shortcuts.lines.forEach(line => console.log(chalk.gray(`  ${line}`)))
    }
}

function shellShortcuts(): { file: string, lines: string[] } | undefined {
    if (process.platform === 'win32') {
        return {
            file: 'your PowerShell profile ($PROFILE)',
            lines: ['function tl { tempo l @args }', 'function tls { tempo ls @args }', 'function td { tempo d @args }']
        }
    }
    const shell = path.basename(process.env.SHELL ?? '')
    const aliases = [`alias tl='${appName} l'`, `alias tls='${appName} ls'`, `alias td='${appName} d'`]
    if (shell === 'zsh') return { file: '~/.zshrc', lines: aliases }
    if (shell === 'bash') return { file: '~/.bashrc', lines: aliases }
    if (shell === 'fish') return { file: '~/.config/fish/config.fish', lines: aliases.map(it => it.replace('=', ' ')) }
    return undefined
}

async function askSecret(number: number, title: string, hint: string, url: string, current?: string): Promise<string> {
    step(number, title, `${hint}\nThe page opens in your browser. Typing is hidden.`)
    openUrl(url)
    const label = current ? `${chalk.cyan('›')} ${chalk.gray('[keep stored token]')} ` : `${chalk.cyan('›')} `
    const input = await prompt(label, { hidden: true, raw: true, allowEmpty: Boolean(current) })
    return input || (current as string)
}

async function ask(current?: string): Promise<string> {
    const label = current ? `${chalk.cyan('›')} ${chalk.gray(`[${current}]`)} ` : `${chalk.cyan('›')} `
    const input = await prompt(label, { raw: true, allowEmpty: Boolean(current) })
    return input || (current as string)
}

function step(number: number, title: string, hint: string) {
    console.log(`\n${chalk.gray(`Step ${number}/${TOTAL_STEPS}`)}  ${chalk.bold(title)}`)
    hint.split('\n').forEach(line => console.log(chalk.gray(`  ${line}`)))
}

function success(message: string) {
    console.log(`${chalk.green('✓')} ${message}`)
}

function failure(message: string) {
    console.log(`${chalk.red('✗')} ${message}`)
}

function tildify(file: string): string {
    const home = os.homedir()
    return file.startsWith(home) ? `~${file.slice(home.length)}` : file
}

export function extractHostname(input: string): string {
    const trimmed = input.trim()
    const urlString = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
    const hostname = new URL(urlString).hostname
    if (!hostname.includes('.')) throw Error('not a hostname')
    return hostname
}
