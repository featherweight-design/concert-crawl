// Cache robots.txt text per domain — fetched once, re-evaluated per path.
// null = fetch failed (fail-open); string = robots.txt content.
const robotsTextCache = new Map<string, string | null>()

// robots.txt is a small static file on the same host we're about to crawl, so a
// slow one signals a sick origin rather than a big payload. Bounded because this
// runs before every platform fetch and outside their deadline budgets (#1199).
const ROBOTS_TIMEOUT_MS = 10_000

// A site can otherwise stall a nightly pass past its deadline budget: a handful
// of venues asking for `Crawl-delay: 300` would blow the run (the #1199 class of
// problem). Honour the request up to this, and log whenever it bites.
export const CRAWL_DELAY_CAP_MS = 30_000

function getDomain(url: string): string {
  return new URL(url).origin
}

type RobotsGroups = {
  // Distinct from `specificRules.length > 0`: a group addressed to us that
  // states only `Allow: /` is a deliberate exemption from the wildcard rules,
  // and it contributes no Disallow lines.
  sawSpecificGroup: boolean
  specificRules: string[]
  wildcardRules: string[]
  specificDelaySec: number | null
  wildcardDelaySec: number | null
}

// Seconds, possibly fractional. Anything unparseable or negative is treated as
// absent rather than as zero — a malformed directive must never make us faster.
function parseDelaySeconds(raw: string): number | null {
  if (raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

/**
 * Walks the robots.txt group structure once, collecting both the `Disallow`
 * rules and the `Crawl-delay` for the groups that apply to us.
 *
 * Group semantics follow RFC 9309: consecutive `User-agent:` lines accumulate
 * into one group, the group's directives start at the first non-`User-agent:`
 * line, a blank line ends the group, and a comment line does not.
 */
// RFC 9309 product tokens carry no version, but sites do write `User-agent:
// ConcertCrawl/1.0`. Compare both sides stripped so such a group still matches.
function productToken(agent: string): string {
  return agent.trim().split('/')[0]?.trim().toLowerCase() ?? ''
}

// RFC 9309 ends a line at the first `#`, wherever it falls, so
// `Crawl-delay: 10 # seconds` states 10 seconds rather than nothing.
function stripInlineComment(line: string): string {
  return line.split('#')[0]?.trim() ?? ''
}

function parseGroups(text: string, userAgent: string): RobotsGroups {
  const lines = text.split('\n').map((line) => line.trim())
  const specificAgent = productToken(userAgent)

  const groups: RobotsGroups = {
    sawSpecificGroup: false,
    specificRules: [],
    wildcardRules: [],
    specificDelaySec: null,
    wildcardDelaySec: null,
  }

  let activeAgents: string[] = []
  let sawDirective = false

  for (const raw of lines) {
    // Checked before the comment strip: a comment-only line must not look like
    // the blank line that ends a group.
    if (raw.startsWith('#')) continue

    const line = stripInlineComment(raw)

    if (line === '') {
      activeAgents = []
      sawDirective = false
      continue
    }

    const lower = line.toLowerCase()

    if (lower.startsWith('user-agent:')) {
      // A `User-agent:` after this group's directives opens a new group.
      if (sawDirective) {
        activeAgents = []
        sawDirective = false
      }
      activeAgents.push(productToken(line.substring('user-agent:'.length)))
      continue
    }

    sawDirective = true

    const inSpecificGroup = activeAgents.includes(specificAgent)
    const inWildcardGroup = activeAgents.includes('*')

    if (inSpecificGroup) groups.sawSpecificGroup = true

    if (lower.startsWith('disallow:')) {
      const disallowPath = line.substring('disallow:'.length).trim()
      if (inSpecificGroup) groups.specificRules.push(disallowPath)
      else if (inWildcardGroup) groups.wildcardRules.push(disallowPath)
    } else if (lower.startsWith('crawl-delay:')) {
      const seconds = parseDelaySeconds(
        line.substring('crawl-delay:'.length).trim(),
      )
      if (seconds === null) continue
      // First valid value per bucket wins, so a later malformed or duplicate
      // directive can't override a delay we already agreed to.
      if (inSpecificGroup) {
        groups.specificDelaySec ??= seconds
      } else if (inWildcardGroup) {
        groups.wildcardDelaySec ??= seconds
      }
    }
  }

  return groups
}

function isPathAllowed(groups: RobotsGroups, path: string): boolean {
  // RFC 9309: only the most specific matching group applies. A group written
  // for us replaces the wildcard group outright, so one that grants us a blanket
  // `Allow: /` alongside a wildcard `Disallow: /` is an exemption, not a denial.
  const rules = groups.sawSpecificGroup
    ? groups.specificRules
    : groups.wildcardRules

  for (const rule of rules) {
    if (rule === '' || rule === '/') {
      if (rule === '/') return false
      continue
    }
    if (path.startsWith(rule)) return false
  }

  return true
}

async function fetchRobotsTxt(
  domain: string,
  userAgent: string,
): Promise<string | null> {
  const cacheKey = `${domain}::${userAgent}`

  if (robotsTextCache.has(cacheKey)) {
    return robotsTextCache.get(cacheKey) ?? null
  }

  const robotsUrl = `${domain}/robots.txt`

  try {
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS),
    })

    if (!response.ok) {
      console.log(
        JSON.stringify({
          event: 'robots.fail_open',
          reason: 'non-200',
          url: robotsUrl,
          status: response.status,
        }),
      )
      robotsTextCache.set(cacheKey, null)
      return null
    }

    const text = await response.text()
    robotsTextCache.set(cacheKey, text)
    return text
  } catch (err) {
    console.log(
      JSON.stringify({
        event: 'robots.fail_open',
        reason: 'error',
        url: robotsUrl,
        error: String(err),
      }),
    )
    robotsTextCache.set(cacheKey, null)
    return null
  }
}

export async function isAllowed(
  url: string,
  userAgent: string,
): Promise<boolean> {
  const domain = getDomain(url)
  const urlPath = new URL(url).pathname

  const robotsText = await fetchRobotsTxt(domain, userAgent)

  // Fail open: if robots.txt couldn't be fetched, allow the crawl
  if (robotsText === null) {
    return true
  }

  const allowed = isPathAllowed(parseGroups(robotsText, userAgent), urlPath)

  console.log(
    JSON.stringify({
      event: allowed ? 'robots.allowed' : 'robots.denied',
      url,
      domain,
    }),
  )

  return allowed
}

/**
 * The site's own requested spacing between requests, in milliseconds, or null
 * when it doesn't state one.
 *
 * Reuses the per-process robots.txt cache, so calling this after the `isAllowed`
 * gate that already ran for the same host and user-agent costs no extra network
 * request. The cache is keyed on both, so a differing user-agent refetches.
 */
export async function getCrawlDelayMs(
  url: string,
  userAgent: string,
): Promise<number | null> {
  const robotsText = await fetchRobotsTxt(getDomain(url), userAgent)
  if (robotsText === null) return null

  const groups = parseGroups(robotsText, userAgent)
  // Deliberately looser than `isPathAllowed`'s group precedence: a wildcard
  // delay still applies when our own group states none. Over-honouring a
  // pacing request only ever makes us slower, so the strict RFC reading buys
  // nothing here and would make us faster than a site plainly asked for.
  const seconds = groups.specificDelaySec ?? groups.wildcardDelaySec
  if (seconds === null) return null

  // Ceil, not round: rounding a fractional value down would leave us fractionally
  // faster than the site asked for, which is the one direction we never go.
  return Math.ceil(seconds * 1000)
}

/**
 * Reconciles our own per-venue pacing with what the site asked for.
 *
 * `max` because we never speed up on the strength of a site permitting it, and
 * `min` because an extreme `Crawl-delay` would otherwise stall a nightly pass.
 */
export function resolveCrawlDelayMs(
  venueDelayMs: number,
  robotsDelayMs: number | null,
  context: { venueId?: string; url?: string } = {},
): number {
  const requested = Math.max(venueDelayMs, robotsDelayMs ?? 0)
  const effective = Math.min(requested, CRAWL_DELAY_CAP_MS)

  if (requested > effective) {
    console.log(
      JSON.stringify({
        event: 'robots.crawl_delay_capped',
        ...context,
        requestedMs: requested,
        appliedMs: effective,
      }),
    )
  }

  return effective
}
