/**
 * Whether the app is publicly browsable, or still behind the private-beta
 * invite gate.
 *
 * `NEXT_PUBLIC_` is required because middleware and client components both read
 * it, and edge middleware has no `process.env` at request time — Next.js
 * inlines the value at build time instead. **Flipping this therefore requires a
 * redeploy, not just an environment change in the Vercel dashboard.**
 *
 * Read as a function rather than a module-scope constant so tests can toggle it
 * with `vi.stubEnv` without re-importing every consumer.
 *
 * Defaults to closed. An unset, misspelled, or empty variable keeps the beta
 * gate up, so the failure mode of a missed config is a locked door rather than
 * an unannounced public launch. See #794.
 */
export const isPublicBrowseEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_PUBLIC_BROWSE === 'true'
