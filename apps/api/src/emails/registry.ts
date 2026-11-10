// apps/api/src/emails/registry.ts
//
// Typed template registry (eng infra spec Part 2 §4.2). Only templates with a
// live sender are registered; the billing and lifecycle set was retired
// 2026-11-10 with the go-free ruling. The send pipeline treats an unregistered
// key as log-and-skip WITHOUT consuming the dedupe key.

import { renderSpotifyDigest } from './templates/spotify-digest.js';
import type {
  EmailTemplateVars,
  LiveEmailTemplateKey,
  TemplateRenderer,
} from './types.js';

const templateRegistry: {
  [K in LiveEmailTemplateKey]?: TemplateRenderer<EmailTemplateVars[K]>;
} = {
  spotify_digest: renderSpotifyDigest,
};

export const getTemplateRenderer = <K extends LiveEmailTemplateKey>(
  templateKey: K,
): TemplateRenderer<EmailTemplateVars[K]> | null =>
  templateRegistry[templateKey] ?? null;
