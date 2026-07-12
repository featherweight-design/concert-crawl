// apps/api/src/emails/registry.ts
//
// Typed template registry (eng infra spec Part 2 §4.2). Deliberately EMPTY
// in PR 5.1 — the 10 template modules land in PRs 5.2/5.3 and register here.
// The send pipeline treats an unregistered key as log-and-skip WITHOUT
// consuming the dedupe key, so real sends happen once templates land.

import type { EmailTemplateKey } from '@concert-crawl/db'
import type { EmailTemplateVars, TemplateRenderer } from './types.js'

const templateRegistry: {
  [K in EmailTemplateKey]?: TemplateRenderer<EmailTemplateVars[K]>
} = {}

export const getTemplateRenderer = <K extends EmailTemplateKey>(
  templateKey: K,
): TemplateRenderer<EmailTemplateVars[K]> | null =>
  templateRegistry[templateKey] ?? null
