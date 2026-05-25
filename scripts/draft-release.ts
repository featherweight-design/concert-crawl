/**
 * Generates a draft Release entry for releases.ts based on PRs merged since
 * the last entry. Run with: pnpm release:draft
 *
 * Output is a TypeScript object you can paste into RELEASES and curate —
 * add a spotlight, founder note, and headline before shipping.
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const releasesPath = resolve(
  rootDir,
  'apps/web/src/lib/definitions/releases.ts',
)

// ── Parse the last release date from releases.ts ──────────────────────────────

const releasesSource = readFileSync(releasesPath, 'utf-8')
const dateMatch = releasesSource.match(/date:\s*'([^']+)'/)
if (!dateMatch) {
  console.error('Could not find a date field in releases.ts')
  process.exit(1)
}
const lastReleaseDate = new Date(dateMatch[1])
console.error(`Last release: ${dateMatch[1]} (${lastReleaseDate.toISOString()})`)

// ── Fetch merged PRs since that date ─────────────────────────────────────────

interface PullRequest {
  number: number
  title: string
  mergedAt: string
  labels: { name: string }[]
}

const raw = execSync(
  'gh pr list --state merged --base main --limit 200 --json number,title,mergedAt,labels',
  { cwd: rootDir },
).toString()

const allPrs: PullRequest[] = JSON.parse(raw)
const prs = allPrs.filter((pr) => new Date(pr.mergedAt) > lastReleaseDate)

if (prs.length === 0) {
  console.error('No PRs merged since last release.')
  process.exit(0)
}

console.error(`Found ${prs.length} PR(s) merged since last release.\n`)

// ── Categorise by conventional commit prefix ──────────────────────────────────

type ItemKind = 'added' | 'fixed' | 'changed' | 'removed'

interface ReleaseItem {
  kind: ItemKind
  text: string
  pr: number
}

function classify(title: string): ItemKind | null {
  const lower = title.toLowerCase()
  if (/^feat(\(|!|:)/.test(lower)) return 'added'
  if (/^fix(\(|!|:)/.test(lower)) return 'fixed'
  if (/^refactor(\(|!|:)/.test(lower)) return 'changed'
  if (/^revert(\(|!|:)/.test(lower)) return 'removed'
  // chore/docs/ci/build/test — skip by default
  return null
}

function stripPrefix(title: string): string {
  // Remove "type(scope): " or "type: " prefix and capitalise
  const cleaned = title.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, '')
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

const items: ReleaseItem[] = []
const skipped: PullRequest[] = []

for (const pr of prs) {
  const kind = classify(pr.title)
  if (kind) {
    items.push({ kind, text: stripPrefix(pr.title), pr: pr.number })
  } else {
    skipped.push(pr)
  }
}

// Sort: added → fixed → changed → removed
const ORDER: ItemKind[] = ['added', 'fixed', 'changed', 'removed']
items.sort((aa, bb) => ORDER.indexOf(aa.kind) - ORDER.indexOf(bb.kind))

// ── Get next version from latest tag ─────────────────────────────────────────

let nextVersion = 'vX.Y.Z-beta'
try {
  const latestTag = execSync('git describe --tags --abbrev=0', {
    cwd: rootDir,
  })
    .toString()
    .trim()
  nextVersion = latestTag
} catch {
  // no tags yet
}

// ── Format today's date ───────────────────────────────────────────────────────

const today = new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/Denver',
})

// ── Output ────────────────────────────────────────────────────────────────────

const itemLines = items
  .map((item) => `    { kind: '${item.kind}', text: '${item.text.replace(/'/g, "\\'")}' }, // PR #${item.pr}`)
  .join('\n')

const output = `  {
    version: '${nextVersion}',
    date: '${today}',
    headline: null, // TODO: add a headline if this is a notable release
    // spotlight: {
    //   title: '',
    //   tagline: '',
    //   hero: 'price', // or whichever hero fits
    //   cta: '',
    //   ctaHref: '',
    //   steps: [{ caption: '' }],
    //   founderNote: '',
    //   founderSign: '— Hugh',
    // },
    items: [
${itemLines}
    ],
  },`

console.log(output)

if (skipped.length > 0) {
  console.error(
    `\nSkipped ${skipped.length} PR(s) (chore/docs/ci/build/test — review manually):`,
  )
  for (const pr of skipped) {
    console.error(`  #${pr.number} ${pr.title}`)
  }
}
