const cache = new Map<string, boolean>()

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
  let currentAgents: string[] = []
  let specificRules: string[] = []
  let wildcardRules: string[] = []
  let inSpecificGroup = false
  let inWildcardGroup = false

  for (const line of lines) {
    if (line.startsWith('#') || line === '') {
      currentAgents = []
      inSpecificGroup = false
      inWildcardGroup = false
      continue
    }

    const lower = line.toLowerCase()

    if (lower.startsWith('user-agent:')) {
      const agent = line.substring('user-agent:'.length).trim().toLowerCase()
      currentAgents = [agent]
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

export async function isAllowed(
  url: string,
  userAgent: string,
): Promise<boolean> {
  const domain = getDomain(url)
  const cacheKey = `${domain}::${userAgent}`

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  const robotsUrl = `${domain}/robots.txt`

  try {
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
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
      cache.set(cacheKey, true)
      return true
    }

    const text = await response.text()
    const urlPath = new URL(url).pathname
    const allowed = parseRobotsTxt(text, userAgent, urlPath)

    console.log(
      JSON.stringify({
        event: allowed ? 'robots.allowed' : 'robots.denied',
        url,
        domain,
      }),
    )
    cache.set(cacheKey, allowed)
    return allowed
  } catch (err) {
    console.log(
      JSON.stringify({
        event: 'robots.fail_open',
        reason: 'error',
        url: robotsUrl,
        error: String(err),
      }),
    )
    cache.set(cacheKey, true)
    return true
  }
}
