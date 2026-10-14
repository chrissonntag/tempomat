import fs from 'fs'
import os from 'os'
import path from 'path'
import configStore from './config/configStore'
import { appVersion, packageRoot } from './version'

export const SKILL_NAME = 'tempo'
const MARKER = /<!-- Installed by tempomat (\S+)\./

export type SkillTarget = 'user' | 'project'

export type SkillInstallation = {
    directory: string
    installedVersion?: string
    exists: boolean
}

export function bundledSkillPath(): string {
    return path.join(packageRoot, 'skill', SKILL_NAME, 'SKILL.md')
}

export function targetDirectory(target: SkillTarget, cwd = process.cwd()): string {
    const base = target === 'user' ? path.join(os.homedir(), '.claude') : path.join(cwd, '.claude')
    return path.join(base, 'skills', SKILL_NAME)
}

export function customDirectory(skillsDirectory: string): string {
    const resolved = path.resolve(skillsDirectory.replace(/^~(?=$|[\\/])/, os.homedir()))
    return path.basename(resolved) === SKILL_NAME ? resolved : path.join(resolved, SKILL_NAME)
}

export function isForeignSkill(directory: string): boolean {
    const file = path.join(directory, 'SKILL.md')
    return fs.existsSync(file) && !MARKER.test(fs.readFileSync(file, 'utf8'))
}

export async function installSkill(directory: string): Promise<{ file: string, backup?: string }> {
    const file = path.join(directory, 'SKILL.md')
    await fs.promises.mkdir(directory, { recursive: true })
    let backup: string | undefined
    if (isForeignSkill(directory)) {
        backup = `${file}.bak`
        await fs.promises.copyFile(file, backup)
    }
    const content = await fs.promises.readFile(bundledSkillPath(), 'utf8')
    const marker = `<!-- Installed by tempomat ${appVersion()}. tempo update and tempo skill:update replace this file. -->\n`
    await fs.promises.writeFile(file, `${content.trimEnd()}\n\n${marker}`)
    const config = await configStore.read()
    config.skillInstallations = [...new Set([...(config.skillInstallations ?? []), directory])]
    await configStore.save(config)
    return { file, backup }
}

export async function listInstallations(): Promise<SkillInstallation[]> {
    const config = await configStore.read()
    return (config.skillInstallations ?? []).map(directory => {
        const file = path.join(directory, 'SKILL.md')
        const exists = fs.existsSync(file)
        const installedVersion = exists ? fs.readFileSync(file, 'utf8').match(MARKER)?.[1] : undefined
        return { directory, installedVersion, exists }
    })
}

export async function updateInstallations(): Promise<{ updated: string[], removed: string[] }> {
    const updated: string[] = []
    const removed: string[] = []
    for (const installation of await listInstallations()) {
        if (installation.exists && installation.installedVersion) {
            await installSkill(installation.directory)
            updated.push(installation.directory)
        } else {
            removed.push(installation.directory)
        }
    }
    if (removed.length > 0) {
        const config = await configStore.read()
        config.skillInstallations = (config.skillInstallations ?? []).filter(it => !removed.includes(it))
        await configStore.save(config)
    }
    return { updated, removed }
}

export async function uninstallSkill(directory: string): Promise<boolean> {
    const file = path.join(directory, 'SKILL.md')
    if (isForeignSkill(directory)) throw Error(`${file} was not installed by tempomat. Remove it yourself if you want it gone.`)
    const existed = fs.existsSync(file)
    await fs.promises.rm(file, { force: true })
    if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) await fs.promises.rmdir(directory)
    const config = await configStore.read()
    config.skillInstallations = (config.skillInstallations ?? []).filter(it => it !== directory)
    await configStore.save(config)
    return existed
}
