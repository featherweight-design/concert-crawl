'use client'

// Accessible switch (role="switch", 40×24) for the Connections card's
// auto-watch preference (#763 PR 5). Button element = native Enter/Space
// activation; visual state mirrors the design handoff toggle.

interface ToggleSwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  ariaLabel: string
  /**
   * Id of the row's body line. `aria-label` replaces the visible title in the
   * accessible name, which leaves the body line unannounced; pointing at it
   * here is the only way a screen reader gets what the switch actually does.
   */
  ariaDescribedBy?: string
  disabled?: boolean
}

export const ToggleSwitch = ({
  checked,
  onChange,
  ariaLabel,
  ariaDescribedBy,
  disabled = false,
}: ToggleSwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="relative inline-block h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60"
    style={{
      background: checked ? 'var(--signal)' : 'var(--surface-3)',
      border: checked
        ? '1px solid var(--signal)'
        : '1px solid var(--border-strong)',
    }}
  >
    <span
      aria-hidden
      className="absolute top-[2px] h-[18px] w-[18px] rounded-full transition-all"
      style={{
        left: checked ? 18 : 2,
        background: checked ? 'var(--fg-on-accent)' : 'var(--fg-subtle)',
      }}
    />
  </button>
)
