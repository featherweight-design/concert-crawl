import { type ButtonHTMLAttributes } from 'react'
import { type LucideIcon } from 'lucide-react'

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md'
  icon?: LucideIcon
  iconRight?: LucideIcon
  fullWidth?: boolean
}

const VARIANT_STYLES: Record<
  NonNullable<AdminButtonProps['variant']>,
  React.CSSProperties
> = {
  primary: {
    background: 'var(--signal)',
    color: 'var(--fg-on-accent)',
    border: '1px solid transparent',
  },
  outline: {
    background: 'transparent',
    color: 'var(--fg)',
    border: '1px solid var(--border-strong)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--fg-muted)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'rgba(184,56,26,0.1)',
    color: 'var(--danger)',
    border: '1px solid rgba(184,56,26,0.25)',
  },
  success: {
    background: 'rgba(47,122,77,0.1)',
    color: 'var(--success)',
    border: '1px solid rgba(47,122,77,0.25)',
  },
}

export const AdminButton = ({
  variant = 'outline',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  children,
  style,
  ...props
}: AdminButtonProps) => {
  const height = size === 'sm' ? 28 : 32
  const px = size === 'sm' ? 10 : 12
  const fontSize = size === 'sm' ? 12 : 13

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height,
        padding: `0 ${px}px`,
        borderRadius: 6,
        fontSize,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={14} />}
      {children}
      {IconRight && <IconRight size={14} />}
    </button>
  )
}
