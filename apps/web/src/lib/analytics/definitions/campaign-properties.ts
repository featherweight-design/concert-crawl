// Campaign tags and ad click ids (posthog-js CAMPAIGN_PARAMS, which includes
// PERSONAL_DATA_CAMPAIGN_PARAMS) and the search-engine keyword (`ph_keyword`,
// read from a Google/Bing/Yahoo/DuckDuckGo referrer's `q` or `p`). Names
// checked against posthog-js 1.412.1 `browser-common/utils/event-utils`.
// posthog-js lifts these out of the landing URL and referrer into their own
// properties, so cutting the query off URL strings does not reach them.
export const CAMPAIGN_PROPERTY_BASES: readonly string[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gad_source',
  'mc_cid',
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'twclid',
  'li_fat_id',
  'igshid',
  'ttclid',
  'rdt_cid',
  'epik',
  'qclid',
  'sccid',
  'irclid',
  '_kx',
  'ph_keyword',
]

// Each one travels three ways: bare (event properties: the campaign names
// while `save_campaign_params` is on, `ph_keyword` on every capture whatever
// the config, via `update_search_keyword`; and `$set_once` from the session's
// entry URL), `$initial_<name>` (`$set_once`, kept while `save_referrer` is
// on) and `$session_entry_<name>` (event properties, from the session props
// manager, which no config turns off).
export const CAMPAIGN_PROPERTIES: readonly string[] =
  CAMPAIGN_PROPERTY_BASES.flatMap((base) => [
    base,
    `$initial_${base}`,
    `$session_entry_${base}`,
  ])
