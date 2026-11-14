/**
 * A link whose `::after` covers its nearest positioned ancestor, so a whole
 * row or card is one click target with one accessible name (Crawl runs'
 * rows, the Events list's past rows). Position a block box (a div row, or a
 * table cell), never a `<tr>`, which WebKit doesn't treat as a containing
 * block reliably.
 */
export const STRETCHED_LINK = "after:absolute after:inset-0 after:content-['']";
