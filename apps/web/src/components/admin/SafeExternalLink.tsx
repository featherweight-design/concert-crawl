import React from 'react'
import { isSafeHttpUrl } from '@/lib/is-safe-http-url'

interface SafeExternalLinkProps {
  href: string | null | undefined
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  title?: string
}

/**
 * An external `<a>` that degrades to plain text when the URL is not http(s).
 *
 * Admin surfaces render URLs that came out of the crawler — JSON-LD on a venue
 * page, or Claude Haiku's reading of one. LLM extraction is by design not
 * constrained to a schema-validated URL shape, so "the crawler wouldn't emit a
 * `javascript:` URL" is an assumption, not a guarantee (#1264). The consumer
 * side already guards the same values; this is the admin-side equivalent.
 *
 * Degrading rather than hiding is deliberate: an admin looking at a flagged
 * event needs to see what the crawler actually captured, and a link that
 * silently disappears is worse for triage than one that won't navigate.
 */
export const SafeExternalLink = ({
  href,
  children,
  className,
  style,
  title,
}: SafeExternalLinkProps) => {
  if (!isSafeHttpUrl(href)) {
    return (
      <span className={className} style={style} title={title}>
        {children}
      </span>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      title={title}
    >
      {children}
    </a>
  )
}
