import { Check } from 'lucide-react';

/**
 * The edit sheet's drawn checkbox (`06/edit-price-desktop`): a dark box with a
 * 1px border, filled cyan with a check when ticked. A real checkbox sits under
 * it for keyboard, focus and screen readers; the drawing follows the theme's
 * tokens rather than the browser's native square.
 */
export const SheetCheckbox = ({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <span
    style={{
      position: 'relative',
      display: 'inline-flex',
      width: 18,
      height: 18,
      flex: 'none',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      style={{
        position: 'absolute',
        inset: 0,
        margin: 0,
        opacity: 0,
        cursor: disabled ? 'default' : 'pointer',
      }}
    />
    <span
      aria-hidden
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 18,
        height: 18,
        borderRadius: 5,
        pointerEvents: 'none',
        border: `1px solid ${checked ? 'var(--signal)' : 'var(--border-strong)'}`,
        background: checked ? 'var(--signal)' : 'var(--bg)',
        color: 'var(--bg)',
      }}
    >
      {checked && <Check size={13} strokeWidth={3} />}
    </span>
  </span>
);
