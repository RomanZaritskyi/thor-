#!/usr/bin/env node
/**
 * Scaffolds the next numbered feature folder from the templates.
 *
 *   node scripts/new-feature.mjs "note tags"
 *   -> specs/002-note-tags/{spec,plan,tasks}.md
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const specsDir = join(root, 'specs')
const templatesDir = join(specsDir, 'templates')

function slugify(input) {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function titleize(slug) {
  return slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

async function nextNumber() {
  const entries = await readdir(specsDir, { withFileTypes: true })
  const numbers = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => /^(\d{3})-/.exec(entry.name)?.[1])
    .filter((value) => value !== undefined)
    .map(Number)

  return String(Math.max(0, ...numbers) + 1).padStart(3, '0')
}

const rawName = process.argv.slice(2).join(' ').trim()

if (rawName === '') {
  console.error('Usage: node scripts/new-feature.mjs "<feature name>"')
  process.exit(1)
}

const slug = slugify(rawName)

if (slug === '') {
  console.error(`Could not derive a slug from "${rawName}".`)
  process.exit(1)
}

const id = `${await nextNumber()}-${slug}`
const featureDir = join(specsDir, id)

if (existsSync(featureDir)) {
  console.error(`${featureDir} already exists.`)
  process.exit(1)
}

await mkdir(featureDir)

const today = new Date().toISOString().slice(0, 10)

for (const kind of ['spec', 'plan', 'tasks']) {
  const template = await readFile(join(templatesDir, `${kind}-template.md`), 'utf8')
  const filled = template
    .replaceAll('<NAME>', titleize(slug))
    .replaceAll('<NNN-slug>', id)
    .replaceAll('<YYYY-MM-DD>', today)

  await writeFile(join(featureDir, `${kind}.md`), filled)
}

console.log(`Created specs/${id}/`)
console.log(`  spec.md   <- start here, then /clarify`)
console.log(`  plan.md`)
console.log(`  tasks.md`)
console.log(`\nSuggested branch: git switch -c feat/${id}`)
