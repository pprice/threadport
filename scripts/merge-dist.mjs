// Combine apps/site/dist and apps/playground/dist into a single dist/ root.
// Site goes at /, playground at /examples/.
import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const targetDir = path.join(repoRoot, 'dist')
const siteDir = path.join(repoRoot, 'apps', 'site', 'dist')
const playgroundDir = path.join(repoRoot, 'apps', 'playground', 'dist')

await rm(targetDir, { force: true, recursive: true })
await mkdir(targetDir, { recursive: true })

await cp(siteDir, targetDir, { recursive: true })
await cp(playgroundDir, path.join(targetDir, 'examples'), { recursive: true })

console.log(`merged → ${targetDir}`)
