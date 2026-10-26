// robots.txt evaluation, following RFC 9309.
//
// What a fetch of robots.txt tells us, cached per origin + user-agent so a run
// fetches each file once and re-evaluates it per path:
//   - `text`: a 2xx body, parsed on demand
//   - `none`: a 4xx ("unavailable" in RFC 9309 §2.3.1.3) — no rules apply
//   - `unreachable`: a 5xx, a 429, a timeout or a network error — RFC 9309
//     §2.3.1.4 says to assume complete disallow, so we do not crawl
type RobotsFetch =
  | { kind: 'text'; text: string }
  | { kind: 'none'; status: number }
  | { kind: 'unreachable'; reason: string }

type CacheEntry = { result: RobotsFetch; fetchedAt: number }

const robotsCache = new Map<string, CacheEntry>()

// The crawler runs as short-lived cron processes, where every pass starts with
// an empty cache. The API process is long-lived and also evaluates robots.txt
// (admin probes, price checks), so entries expire rather than living for the
// life of the process: an edit a site makes is in force within the hour.
const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000

// robots.txt is a small static file on the same host we're about to crawl, so a
// slow one signals a sick origin rather than a big payload. Bounded because this
// runs before every platform fetch and outside their deadline budgets (#1199).
const ROBOTS_TIMEOUT_MS = 10_000

// A site can otherwise stall a nightly pass past its deadline budget: a handful
// of venues asking for `Crawl-delay: 300` would blow the run (the #1199 class of
// problem). We never pace faster than a site asks, so a site asking for more
// than this is skipped for the run instead (see `resolveCrawlDelayMs`).
export const CRAWL_DELAY_CAP_MS = 30_000

/**
 * The product tokens Anthropic documents for its crawlers. Page text that a
 * site has closed to these goes nowhere near the LLM extractor: we send it to
 * Claude, so a rule written for Claude is a rule about our use (#1295 made
 * this call for one venue; `isAiUseAllowed` makes it for every venue).
 */
export const AI_USER_AGENTS = [
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'Claude-Web',
  'anthropic-ai',
] as const

function getDomain(url: string): string {
  return new URL(url).origin
}

type Rule = { allow: boolean; path: string }

type Group = {
  agents: string[]
  rules: Rule[]
  delaySec: number | null
  // Cloudflare's `Content-Signal:` directive, e.g. `ai-input=no`.
  contentSignals: Map<string, string>
}

// Seconds, possibly fractional. Anything unparseable or negative is treated as
// absent rather than as zero — a malformed directive must never make us faster.
function parseDelaySeconds(raw: string): number | null {
  if (raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

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

function parseContentSignals(raw: string): Map<string, string> {
  const signals = new Map<string, string>()
  for (const pair of raw.split(',')) {
    const [key, value] = pair
      .split('=')
      .map((part) => part.trim().toLowerCase())
    if (key && value) signals.set(key, value)
  }
  return signals
}

/**
 * Splits robots.txt into its groups.
 *
 * Group semantics follow RFC 9309: consecutive `User-agent:` lines accumulate
 * into one group, the group's directives start at the first non-`User-agent:`
 * line, and a comment line does not end a group. A blank line also ends one,
 * which is stricter than the RFC: directives stranded after it apply to nobody.
 */
function parseGroups(text: string): Group[] {
  const groups: Group[] = []
  let current: Group | null = null
  let sawDirective = false

  for (const raw of text.split('\n').map((line) => line.trim())) {
    // Checked before the comment strip: a comment-only line must not look like
    // the blank line that ends a group.
    if (raw.startsWith('#')) continue
    const line = stripInlineComment(raw)

    if (line === '') {
      current = null
      sawDirective = false
      continue
    }

    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.substring(0, colon).trim().toLowerCase()
    const value = line.substring(colon + 1).trim()

    if (key === 'user-agent') {
      // A `User-agent:` after this group's directives opens a new group.
      if (current === null || sawDirective) {
        current = {
          agents: [],
          rules: [],
          delaySec: null,
          contentSignals: new Map(),
        }
        groups.push(current)
        sawDirective = false
      }
      current.agents.push(productToken(value))
      continue
    }

    if (current === null) continue
    sawDirective = true

    if (key === 'allow' || key === 'disallow') {
      // An empty path matches nothing (`Disallow:` with no value allows all).
      if (value !== '')
        current.rules.push({ allow: key === 'allow', path: value })
    } else if (key === 'crawl-delay') {
      // First valid value per group wins, so a later malformed or duplicate
      // directive can't override a delay we already agreed to.
      current.delaySec ??= parseDelaySeconds(value)
    } else if (key === 'content-signal') {
      for (const [signal, setting] of parseContentSignals(value)) {
        current.contentSignals.set(signal, setting)
      }
    }
  }

  return groups
}

/**
 * The groups that apply to an agent: every group naming its product token,
 * combined (RFC 9309 §2.2.1), or failing that every `*` group, combined. A
 * group written for us replaces the wildcard groups outright, so one that
 * grants us `Allow: /` alongside a wildcard `Disallow: /` is an exemption.
 */
function groupsFor(groups: Group[], userAgent: string): Group[] {
  const token = productToken(userAgent)
  const specific = groups.filter((group) => group.agents.includes(token))
  if (specific.length > 0) return specific
  return groups.filter((group) => group.agents.includes('*'))
}

// The length a rule's path counts for in longest-match precedence, and whether
// it matches. `*` matches any run of characters and a trailing `$` anchors the
// end, per RFC 9309 §2.2.3.
function ruleMatches(rulePath: string, target: string): boolean {
  const anchored = rulePath.endsWith('$')
  const body = anchored ? rulePath.slice(0, -1) : rulePath
  const pattern = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${pattern}${anchored ? '$' : ''}`).test(target)
}

/**
 * RFC 9309 §2.2.2: the most specific (longest) matching rule wins, and on a
 * tie between an Allow and a Disallow, Allow wins. No matching rule = allowed.
 * `/robots.txt` itself is always allowed.
 */
function isPathAllowed(rules: Rule[], target: string): boolean {
  if (target === '/robots.txt') return true
  let best: Rule | null = null
  for (const rule of rules) {
    if (!ruleMatches(rule.path, target)) continue
    if (
      best === null ||
      rule.path.length > best.path.length ||
      (rule.path.length === best.path.length && rule.allow)
    ) {
      best = rule
    }
  }
  return best?.allow ?? true
}

function pathOf(url: string): string {
  const parsed = new URL(url)
  return `${parsed.pathname}${parsed.search}`
}

async function fetchRobotsTxt(
  domain: string,
  userAgent: string,
): Promise<RobotsFetch> {
  const cacheKey = `${domain}::${userAgent}`
  const cached = robotsCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_CACHE_TTL_MS) {
    return cached.result
  }

  const robotsUrl = `${domain}/robots.txt`
  let result: RobotsFetch
  try {
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS),
    })
    if (response.ok) {
      result = { kind: 'text', text: await response.text() }
    } else if (
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 429
    ) {
      // A 429 is the server telling us to back off, not that the file doesn't
      // exist, so it joins the 5xx family below rather than this one.
      result = { kind: 'none', status: response.status }
    } else {
      result = { kind: 'unreachable', reason: `HTTP ${response.status}` }
    }
  } catch (err) {
    result = { kind: 'unreachable', reason: String(err) }
  }

  if (result.kind !== 'text') {
    console.log(
      JSON.stringify({
        event:
          result.kind === 'none' ? 'robots.unavailable' : 'robots.unreachable',
        url: robotsUrl,
        ...(result.kind === 'none'
          ? { status: result.status }
          : { reason: result.reason }),
      }),
    )
  }

  robotsCache.set(cacheKey, { result, fetchedAt: Date.now() })
  return result
}

export type RobotsVerdict =
  | { status: 'allowed' }
  | { status: 'disallowed' }
  | { status: 'unreachable'; reason: string }

/**
 * Whether `userAgent` may fetch `url`, with the reason when it may not. A
 * robots.txt we could not reach is a `unreachable` verdict, never an allow.
 */
export async function checkRobots(
  url: string,
  userAgent: string,
): Promise<RobotsVerdict> {
  const domain = getDomain(url)
  const robots = await fetchRobotsTxt(domain, userAgent)

  if (robots.kind === 'unreachable') {
    return { status: 'unreachable', reason: robots.reason }
  }
  if (robots.kind === 'none') return { status: 'allowed' }

  const rules = groupsFor(parseGroups(robots.text), userAgent).flatMap(
    (group) => group.rules,
  )
  const allowed = isPathAllowed(rules, pathOf(url))
  console.log(
    JSON.stringify({
      event: allowed ? 'robots.allowed' : 'robots.denied',
      url,
      domain,
    }),
  )
  return allowed ? { status: 'allowed' } : { status: 'disallowed' }
}

/** `checkRobots` as a yes/no: anything but an explicit allow is a no. */
export async function isAllowed(
  url: string,
  userAgent: string,
): Promise<boolean> {
  return (await checkRobots(url, userAgent)).status === 'allowed'
}

/**
 * Whether a page's text may be sent to an AI model, judged by the site's own
 * robots.txt: no applicable group for an Anthropic crawler disallows the path,
 * and no group that applies to us states `Content-Signal: ai-input=no`.
 *
 * Fetched as `userAgent` (ourselves) and read on the same cache as the
 * `isAllowed` gate, so this costs no extra request.
 */
export async function isAiUseAllowed(
  url: string,
  userAgent: string,
): Promise<boolean> {
  const robots = await fetchRobotsTxt(getDomain(url), userAgent)
  if (robots.kind === 'unreachable') return false
  if (robots.kind === 'none') return true

  const groups = parseGroups(robots.text)
  const target = pathOf(url)

  for (const agent of AI_USER_AGENTS) {
    const specific = groups.filter((group) =>
      group.agents.includes(productToken(agent)),
    )
    if (specific.length === 0) continue
    const rules = specific.flatMap((group) => group.rules)
    if (!isPathAllowed(rules, target)) return false
  }

  const signalled = groupsFor(groups, userAgent).some(
    (group) => group.contentSignals.get('ai-input') === 'no',
  )
  return !signalled
}

/**
 * The site's own requested spacing between requests, in milliseconds, or null
 * when it doesn't state one.
 *
 * Reuses the robots.txt cache, so calling this after the `isAllowed` gate that
 * already ran for the same host and user-agent costs no extra network request.
 * The cache is keyed on both, so a differing user-agent refetches.
 */
export async function getCrawlDelayMs(
  url: string,
  userAgent: string,
): Promise<number | null> {
  const robots = await fetchRobotsTxt(getDomain(url), userAgent)
  if (robots.kind !== 'text') return null

  const groups = parseGroups(robots.text)
  const token = productToken(userAgent)
  const firstDelay = (matching: Group[]): number | null =>
    matching.find((group) => group.delaySec !== null)?.delaySec ?? null
  // Deliberately looser than `groupsFor`'s precedence: a wildcard delay still
  // applies when our own group states none. Over-honouring a pacing request
  // only ever makes us slower, so the strict RFC reading buys nothing here and
  // would make us faster than a site plainly asked for.
  const seconds =
    firstDelay(groups.filter((group) => group.agents.includes(token))) ??
    firstDelay(groups.filter((group) => group.agents.includes('*')))
  if (seconds === null) return null

  // Ceil, not round: rounding a fractional value down would leave us fractionally
  // faster than the site asked for, which is the one direction we never go.
  return Math.ceil(seconds * 1000)
}

/**
 * Reconciles our own per-venue pacing with what the site asked for, or null
 * when the site asked for more than one run can honour.
 *
 * `max` because we never speed up on the strength of a site permitting it. A
 * site `Crawl-delay` above the cap returns null and the caller skips the venue
 * for the run: pacing it at the cap would be faster than it asked. Our own
 * per-venue delay above the cap is our choice, so that one is simply capped.
 */
export function resolveCrawlDelayMs(
  venueDelayMs: number,
  robotsDelayMs: number | null,
  context: { venueId?: string; url?: string } = {},
): number | null {
  if (robotsDelayMs !== null && robotsDelayMs > CRAWL_DELAY_CAP_MS) {
    console.log(
      JSON.stringify({
        event: 'robots.crawl_delay_exceeds_cap',
        ...context,
        requestedMs: robotsDelayMs,
        capMs: CRAWL_DELAY_CAP_MS,
      }),
    )
    return null
  }

  return Math.min(
    Math.max(venueDelayMs, robotsDelayMs ?? 0),
    CRAWL_DELAY_CAP_MS,
  )
}
