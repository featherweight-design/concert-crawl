// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SafeExternalLink } from '@/components/admin/SafeExternalLink'

afterEach(cleanup)

describe('SafeExternalLink', () => {
  it('renders an anchor for http(s) URLs', () => {
    render(<SafeExternalLink href="https://example.com">open</SafeExternalLink>)

    const link = screen.getByRole('link', { name: 'open' })
    expect(link.getAttribute('href')).toBe('https://example.com')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'not a url at all',
  ])('degrades %s to plain text', (href) => {
    render(<SafeExternalLink href={href}>open</SafeExternalLink>)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('open').tagName).toBe('SPAN')
  })

  it.each([null, undefined])('degrades a %s href to plain text', (href) => {
    render(<SafeExternalLink href={href}>open</SafeExternalLink>)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('open').tagName).toBe('SPAN')
  })

  it('keeps styling hooks on the degraded span so layout does not shift', () => {
    render(
      <SafeExternalLink href="javascript:alert(1)" className="truncate">
        open
      </SafeExternalLink>,
    )

    expect(screen.getByText('open').className).toBe('truncate')
  })
})
