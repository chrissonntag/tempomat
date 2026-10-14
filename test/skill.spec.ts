import fs from 'fs'
import os from 'os'
import path from 'path'
import configStore from '../src/config/configStore'
import { customDirectory, installSkill, isForeignSkill, listInstallations, uninstallSkill, updateInstallations } from '../src/skill'
import { appVersion } from '../src/version'

jest.mock('../src/config/configStore', () => jest.requireActual('./mocks/configStore'))

let root: string

beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'tempomat-skill-'))
    await configStore.save({})
})

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
})

const skillFile = (directory: string) => path.join(directory, 'SKILL.md')

test('installs the bundled skill with a version marker and tracks it', async () => {
    const directory = path.join(root, 'tempo')

    await installSkill(directory)

    const content = fs.readFileSync(skillFile(directory), 'utf8')
    expect(content).toContain('name: tempo')
    expect(content).toContain(`<!-- Installed by tempomat ${appVersion()}.`)
    expect(await listInstallations()).toEqual([{ directory, installedVersion: appVersion(), exists: true }])
})

test('backs up a skill the user wrote before replacing it', async () => {
    const directory = path.join(root, 'tempo')
    fs.mkdirSync(directory)
    fs.writeFileSync(skillFile(directory), 'my own skill')
    expect(isForeignSkill(directory)).toBe(true)

    const result = await installSkill(directory)

    expect(fs.readFileSync(result.backup as string, 'utf8')).toBe('my own skill')
    expect(isForeignSkill(directory)).toBe(false)
})

test('updates tracked copies and stops tracking replaced or removed ones', async () => {
    const kept = path.join(root, 'a', 'tempo')
    const replaced = path.join(root, 'b', 'tempo')
    const removed = path.join(root, 'c', 'tempo')
    for (const directory of [kept, replaced, removed]) await installSkill(directory)
    fs.writeFileSync(skillFile(kept), fs.readFileSync(skillFile(kept), 'utf8').replace(appVersion(), '0.0.1'))
    fs.writeFileSync(skillFile(replaced), 'rewritten by the user')
    fs.rmSync(removed, { recursive: true })

    const result = await updateInstallations()

    expect(result).toEqual({ updated: [kept], removed: [replaced, removed] })
    expect(fs.readFileSync(skillFile(kept), 'utf8')).toContain(`tempomat ${appVersion()}.`)
    expect(fs.readFileSync(skillFile(replaced), 'utf8')).toBe('rewritten by the user')
    expect((await configStore.read()).skillInstallations).toEqual([kept])
})

test('uninstalls its own copy but never a file the user wrote', async () => {
    const own = path.join(root, 'own', 'tempo')
    const foreign = path.join(root, 'foreign', 'tempo')
    await installSkill(own)
    fs.mkdirSync(foreign, { recursive: true })
    fs.writeFileSync(skillFile(foreign), 'mine')

    await uninstallSkill(own)

    expect(fs.existsSync(own)).toBe(false)
    expect((await configStore.read()).skillInstallations).toEqual([])
    await expect(uninstallSkill(foreign)).rejects.toThrow('was not installed by tempomat')
    expect(fs.readFileSync(skillFile(foreign), 'utf8')).toBe('mine')
})

test.each([
    ['/opt/skills', '/opt/skills/tempo'],
    ['/opt/skills/tempo', '/opt/skills/tempo']
])('installs into %p as %p', (input, expected) => {
    expect(customDirectory(input)).toBe(path.resolve(expected))
})
