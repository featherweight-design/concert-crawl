import { describe, it, expect } from 'vitest'
import {
  parseArgs,
  assertWriteHostNotProd,
} from './sync-prod-public-data-helpers.js'

describe('parseArgs', () => {
  it('defaults dryRun to false', () => {
    expect(parseArgs(['tsx', 'x.ts'])).toEqual({ dryRun: false })
  })
  it('flips dryRun to true when --dry-run is passed', () => {
    expect(parseArgs(['tsx', 'x.ts', '--dry-run'])).toEqual({ dryRun: true })
  })
})

describe('assertWriteHostNotProd', () => {
  it('throws if write host matches prod host', () => {
    expect(() =>
      assertWriteHostNotProd(
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db',
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db',
      ),
    ).toThrow(/refusing to write to prod/i)
  })
  it('passes when hosts differ', () => {
    expect(() =>
      assertWriteHostNotProd(
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db',
        'postgres://u:p@ep-staging.us-east-2.aws.neon.tech/db',
      ),
    ).not.toThrow()
  })
  it('throws a descriptive error when NEON_PROD_DIRECT is malformed', () => {
    expect(() =>
      assertWriteHostNotProd(
        'not-a-valid-url',
        'postgres://u:p@ep-staging.us-east-2.aws.neon.tech/db',
      ),
    ).toThrow(/NEON_PROD_DIRECT is not a valid URL/)
  })
  it('throws a descriptive error when NEON_STAGING_DIRECT is malformed', () => {
    expect(() =>
      assertWriteHostNotProd(
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db',
        'not-a-valid-url',
      ),
    ).toThrow(/NEON_STAGING_DIRECT is not a valid URL/)
  })
  it('throws when hostnames match but ports differ (compares hostname, not host)', () => {
    // Regression test: URL.host includes the port, so if we compared `host`,
    // a swap where one URL includes an explicit port would slip through.
    // Both URLs point at the same Neon endpoint — one with explicit port,
    // one without. This MUST be flagged as a prod-write attempt.
    expect(() =>
      assertWriteHostNotProd(
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db',
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech:5432/db',
      ),
    ).toThrow(/refusing to write to prod/i)
  })
  it('throws when one URL names the prod branch by its pooled endpoint', () => {
    // Neon gives one branch two hostnames, and choosing between them is a
    // single dropdown in the console. A raw string comparison reads these as
    // different hosts and lets the sync write into production.
    expect(() =>
      assertWriteHostNotProd(
        'postgres://u:p@ep-prod-123456.us-east-2.aws.neon.tech/db',
        'postgres://u:p@ep-prod-123456-pooler.us-east-2.aws.neon.tech/db',
      ),
    ).toThrow(/refusing to write to prod/i)
  })
  it('still passes when a pooled staging endpoint faces a direct prod one', () => {
    expect(() =>
      assertWriteHostNotProd(
        'postgres://u:p@ep-prod-123456.us-east-2.aws.neon.tech/db',
        'postgres://u:p@ep-staging-654321-pooler.us-east-2.aws.neon.tech/db',
      ),
    ).not.toThrow()
  })
})
