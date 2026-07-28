// Cache robots.txt text per domain — fetched once, re-evaluated per path.
// null = fetch failed (fail-open); string = robots.txt content.
const robotsTextCache = new Map<string, string | null>()

// robots.txt is a small static file on the same host we're about to crawl, so a
// slow one signals a sick origin rather than a big payload. Bounded because this
// runs before every platform fetch and outside their deadline budgets (#1199).
const ROBOTS_TIMEOUT_MS = 10_000

function getDomain(url: string): string {
  return new URL(url).origin
}

function parseRobotsTxt(
  text: string,
  userAgent: string,
  path: string,
): boolean {
  const lines = text.split('\n').map((l) => l.trim())
  const specificAgent = userAgent.split('/')[0]?.toLowerCase() ?? ''

  // Collect applicable disallow rules for the most specific matching user-agent group
  let specificRules: string[] = []
  let wildcardRules: string[] = []
  let inSpecificGroup = false
  let inWildcardGroup = false

  for (const line of lines) {
    if (line.startsWith('#') || line === '') {
      inSpecificGroup = false
      inWildcardGroup = false
      continue
    }

    const lower = line.toLowerCase()

    if (lower.startsWith('user-agent:')) {
      const agent = line.substring('user-agent:'.length).trim().toLowerCase()
      inSpecificGroup = agent === specificAgent
      inWildcardGroup = agent === '*'
    } else if (lower.startsWith('disallow:')) {
      const disallowPath = line.substring('disallow:'.length).trim()
      if (inSpecificGroup) specificRules.push(disallowPath)
      else if (inWildcardGroup) wildcardRules.push(disallowPath)
    }
  }

  // Specific user-agent rules take precedence
  const rules = specificRules.length > 0 ? specificRules : wildcardRules

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

  const allowed = parseRobotsTxt(robotsText, userAgent, urlPath)

  console.log(
    JSON.stringify({
      event: allowed ? 'robots.allowed' : 'robots.denied',
      url,
      domain,
    }),
  )

  return allowed
}
