import { z } from 'zod'

// z.string().url() delegates to `new URL()`, which accepts any scheme —
// javascript: and data: URLs pass it. Those values are stored and later rendered
// into an href on consumer surfaces, so accepting one is a stored-XSS vector.
// Every user- or admin-supplied URL that we persist goes through this instead.
// maxLength is applied before the refine, since .refine() yields a ZodEffects
// that no longer exposes string methods like .max().
export const httpUrl = (maxLength?: number) =>
  (maxLength == null
    ? z.string().url()
    : z.string().url().max(maxLength)
  ).refine(
    (value) => {
      try {
        const { protocol } = new URL(value)
        return protocol === 'http:' || protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'URL must use http or https' },
  )
