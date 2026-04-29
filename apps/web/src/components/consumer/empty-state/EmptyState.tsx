import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  message: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface-1 px-6 py-16 text-center',
        className,
      )}
    >
      <span className="text-4xl opacity-30" aria-hidden>
        ♩
      </span>
      <p className="text-base font-medium text-fg-muted">{message}</p>
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {action.label}
          </button>
        ))}
    </div>
  )
}
