// Divider between a scope chip and whatever follows it in the FilterBar chip
// row (mock: 1×20px --border with 2px side margins).
//
// Each scope chip renders its OWN trailing divider rather than the row placing
// them, so a chip that returns null while its entitlement resolves can never
// leave an orphaned rule behind. Two scope chips in a row therefore produce
// [scope] | [scope] | [dimension chips] — never two adjacent rules, because
// the divider trails rather than leads. The rule holds whatever order the
// FilterBar happens to render the scope chips in.

export const ChipDivider = () => (
  <span
    aria-hidden
    className="shrink-0"
    style={{
      width: 1,
      height: 20,
      background: 'var(--border)',
      margin: '0 2px',
    }}
  />
)
