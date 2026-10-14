import { spawn } from 'child_process'

export type SecretName = 'tempoToken' | 'atlassianToken'

export type SecretStore = {
    name: string
    available(): Promise<boolean>
    get(name: SecretName): Promise<string | undefined>
    getAll?(names: SecretName[]): Promise<Partial<Record<SecretName, string>>>
    set(name: SecretName, value: string): Promise<void>
    delete(name: SecretName): Promise<void>
}

export type RunResult = { code: number | null, stdout: string, stderr: string }

export type Runner = (command: string, args: string[], input?: string) => Promise<RunResult>

const SERVICE = process.env.TEMPOMAT_KEYCHAIN_SERVICE || 'tempomat'

export const run: Runner = (command, args, input) => new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', error => resolve({ code: null, stdout, stderr: error.message }))
    child.on('close', code => resolve({ code, stdout, stderr }))
    child.stdin.end(input ?? '')
})

export function macKeychain(runner: Runner = run): SecretStore {
    return {
        name: 'macOS Keychain',
        async available() {
            const result = await runner('security', ['show-keychain-info'])
            return result.code === 0 || /User interaction is not allowed/.test(result.stderr)
        },
        async get(name) {
            const result = await runner('security', ['find-generic-password', '-s', SERVICE, '-a', name, '-w'])
            return result.code === 0 ? result.stdout.replace(/\n$/, '') : undefined
        },
        async set(name, value) {
            if (!/^[\x20-\x7e]*$/.test(value)) throw Error(`The macOS Keychain only takes ${name} values made of printable ASCII characters.`)
            const quoted = `"${value.replace(/(["\\])/g, '\\$1')}"`
            const result = await runner('security', ['-i'], `add-generic-password -U -s ${SERVICE} -a ${name} -w ${quoted}\n`)
            if (result.code !== 0 || result.stderr.trim()) throw Error(`Could not store ${name} in the macOS Keychain: ${result.stderr.trim()}`)
        },
        async delete(name) {
            await runner('security', ['delete-generic-password', '-s', SERVICE, '-a', name])
        }
    }
}

export function secretService(runner: Runner = run): SecretStore {
    return {
        name: 'system keyring (Secret Service)',
        async available() {
            const result = await runner('secret-tool', ['lookup', 'service', SERVICE, 'account', 'availability-probe'])
            return result.code !== null && result.stderr.trim() === ''
        },
        async get(name) {
            const result = await runner('secret-tool', ['lookup', 'service', SERVICE, 'account', name])
            return result.code === 0 ? result.stdout.replace(/\n$/, '') : undefined
        },
        async set(name, value) {
            const result = await runner('secret-tool', ['store', `--label=tempomat ${name}`, 'service', SERVICE, 'account', name], value)
            if (result.code !== 0) throw Error(`Could not store ${name} in the system keyring: ${result.stderr.trim()}`)
        },
        async delete(name) {
            await runner('secret-tool', ['clear', 'service', SERVICE, 'account', name])
        }
    }
}

const DPAPI_PREFIX = 'Add-Type -AssemblyName System.Security; $in = [Console]::In.ReadToEnd();'

export function windowsDpapi(runner: Runner = run, blobs: Partial<Record<SecretName, string>> = {}): Required<SecretStore> & { blobs: Partial<Record<SecretName, string>> } {
    const powershell = (script: string, input: string) =>
        runner('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `${DPAPI_PREFIX} ${script}`], input)
    const getAll = async (names: SecretName[]): Promise<Partial<Record<SecretName, string>>> => {
        const stored = names.filter(name => blobs[name])
        if (stored.length === 0) return {}
        const result = await powershell(
            "[Console]::Out.Write((($in.Trim() -split ',') | ForEach-Object { [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($_), $null, 'CurrentUser')) }) -join ',')",
            stored.map(name => blobs[name]).join(',')
        )
        const values = result.stdout.trim().split(',')
        if (result.code !== 0 || values.length !== stored.length) throw Error(`Could not decrypt ${stored.join(' and ')}: ${result.stderr.trim()}`)
        return Object.fromEntries(stored.map((name, i) => [name, Buffer.from(values[i], 'base64').toString('utf8')]))
    }
    return {
        name: 'Windows Data Protection (your user account)',
        blobs,
        async available() {
            const result = await powershell('[Console]::Out.Write("ok")', '')
            return result.code === 0 && result.stdout === 'ok'
        },
        async get(name) {
            return (await getAll([name]))[name]
        },
        getAll,
        async set(name, value) {
            const result = await powershell(
                "[Console]::Out.Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Convert]::FromBase64String($in.Trim()), $null, 'CurrentUser')))",
                Buffer.from(value, 'utf8').toString('base64')
            )
            if (result.code !== 0 || !result.stdout) throw Error(`Could not encrypt ${name}: ${result.stderr.trim()}`)
            blobs[name] = result.stdout.trim()
        },
        async delete(name) {
            delete blobs[name]
        }
    }
}

export function platformSecretStore(blobs?: Partial<Record<SecretName, string>>): SecretStore & { blobs?: Partial<Record<SecretName, string>> } {
    if (process.platform === 'darwin') return macKeychain()
    if (process.platform === 'win32') return windowsDpapi(run, blobs)
    return secretService()
}
