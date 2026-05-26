import Filter from 'bad-words'

const filter = new Filter()

const EMAIL_RE = /\S+@\S+\.\S+/
const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/

export function moderateNote(note: string): { ok: boolean; reason?: string } {
  if (filter.isProfane(note)) {
    return { ok: false, reason: 'Note contains prohibited language.' }
  }
  if (EMAIL_RE.test(note)) {
    return { ok: false, reason: 'Notes cannot contain email addresses.' }
  }
  if (PHONE_RE.test(note)) {
    return { ok: false, reason: 'Notes cannot contain phone numbers.' }
  }
  return { ok: true }
}
