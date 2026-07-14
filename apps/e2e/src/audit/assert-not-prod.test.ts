import { describe, it, expect } from 'vitest'
import { assertNotProdBaseUrl } from './assert-not-prod.js'

describe('assertNotProdBaseUrl', () => {
  it('rejects the bare prod host', () => {
    expect(() => assertNotProdBaseUrl('https://concertcrawl.app')).toThrow(
      /refusing to run audit against production/i,
    )
  })

  it('rejects the www prod host', () => {
    expect(() =>
      assertNotProdBaseUrl('https://www.concertcrawl.app/admin'),
    ).toThrow(/refusing to run audit against production/i)
  })

  it('accepts the staging origin', () => {
    expect(() =>
      assertNotProdBaseUrl('https://staging.concertcrawl.app'),
    ).not.toThrow()
  })

  it('accepts any subdomain other than www', () => {
    expect(() =>
      assertNotProdBaseUrl('https://preview.concertcrawl.app'),
    ).not.toThrow()
  })

  it('accepts localhost URLs for local dev', () => {
    expect(() => assertNotProdBaseUrl('http://localhost:3000')).not.toThrow()
    expect(() => assertNotProdBaseUrl('http://127.0.0.1:3000')).not.toThrow()
  })

  it('throws a helpful error on unparseable URLs', () => {
    expect(() => assertNotProdBaseUrl('not-a-url')).toThrow(/could not parse/i)
  })
})
