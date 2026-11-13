// A submitter handle is stored bare ("hugh"); every price card shows it as
// "@hugh". One helper so the live and pending cards cannot drift. Idempotent,
// so a handle that already carries its "@" is not doubled.
export function formatHandle(handle: string): string {
  return handle.startsWith('@') ? handle : `@${handle}`;
}
