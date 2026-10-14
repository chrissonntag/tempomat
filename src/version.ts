import fs from 'fs'
import path from 'path'

export const packageRoot = path.join(__dirname, '..')

export function appVersion(): string {
    return JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version
}
