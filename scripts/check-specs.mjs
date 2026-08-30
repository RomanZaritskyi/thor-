#!/usr/bin/env node
/**
 * Traceability gate. Proves that every specified requirement is planned, tasked
 * and tested — the part of spec-driven development that is easy to skip and
 * expensive to skip.
 *
 *   node scripts/check-specs.mjs
 */
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const specsDir = join(root, 'specs')

const REQUIRED_SECTIONS = ['## Problem', '## Outcome', '## Requirements']
const TEST_GLOBS = ['src', 'e2e']

const findings = []

function report(level, feature, message) {
  findings.push({ level, feature, message })
}

async function collectTestSources() {
  const sources = []

  async function walk(dir) {
    if (!existsSync(dir)) return

    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)

      if (entry.isDirectory()) {
        await walk(full)
      } else if (/\.(test|spec)\.tsx?$/.test(entry.name)) {
        sources.push({ path: relative(root, full), text: await readFile(full, 'utf8') })
      }
    }
  }

  for (const base of TEST_GLOBS) await walk(join(root, base))

  return sources
}

function requirementIds(specText) {
  const table = specText.split('## Requirements')[1]?.split('\n## ')[0] ?? ''
  return [...new Set([...table.matchAll(/\bFR-(\d{3})\b/g)].map((match) => `FR-${match[1]}`))]
}

const testSources = await collectTestSources()
const features = (await readdir(specsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort()

if (features.length === 0) {
  console.log('No feature specs yet. Run `pnpm spec:new "<feature name>"` to add one.')
  process.exit(0)
}

for (const feature of features) {
  const specPath = join(specsDir, feature, 'spec.md')

  if (!existsSync(specPath)) {
    report('error', feature, 'spec.md is missing')
    continue
  }

  const spec = await readFile(specPath, 'utf8')

  for (const section of REQUIRED_SECTIONS) {
    if (!spec.includes(section)) report('error', feature, `spec.md has no "${section}" section`)
  }

  const unresolved = [...spec.matchAll(/\[NEEDS CLARIFICATION:([^\]]*)\]/g)]
  const status = /^- \*\*Status:\*\*\s*(\S+)/m.exec(spec)?.[1] ?? 'unknown'

  for (const match of unresolved) {
    const level = status === 'draft' ? 'warn' : 'error'
    report(level, feature, `unresolved clarification:${match[1].trim()}`)
  }

  const ids = requirementIds(spec)

  if (ids.length === 0) {
    report('error', feature, 'no FR-xxx requirements found in the Requirements table')
    continue
  }

  const tasksPath = join(specsDir, feature, 'tasks.md')
  const tasks = existsSync(tasksPath) ? await readFile(tasksPath, 'utf8') : ''
  const planPath = join(specsDir, feature, 'plan.md')
  const plan = existsSync(planPath) ? await readFile(planPath, 'utf8') : ''

  for (const id of ids) {
    if (tasks !== '' && !tasks.includes(id)) {
      report('error', feature, `${id} is never referenced in tasks.md`)
    }

    if (plan !== '' && !plan.includes(id)) {
      report('warn', feature, `${id} is never referenced in plan.md`)
    }

    if (status === 'shipped' && !testSources.some((source) => source.text.includes(id))) {
      report('error', feature, `${id} is not named by any test`)
    }
  }

  console.log(
    `${feature}: ${String(ids.length)} requirements, status "${status}"` +
      (status === 'shipped' ? ', tests checked' : ''),
  )
}

const errors = findings.filter((finding) => finding.level === 'error')
const warnings = findings.filter((finding) => finding.level === 'warn')

for (const finding of [...errors, ...warnings]) {
  const prefix = finding.level === 'error' ? 'ERROR' : 'warn '
  console.log(`${prefix}  ${finding.feature}: ${finding.message}`)
}

console.log(
  `\n${String(errors.length)} error(s), ${String(warnings.length)} warning(s) across ${String(features.length)} feature(s).`,
)

process.exit(errors.length > 0 ? 1 : 0)
