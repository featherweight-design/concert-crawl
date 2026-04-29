import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-border-focus focus-visible:ring-[3px] focus-visible:ring-border-focus has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-danger aria-invalid:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)] [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-accent text-fg-on-accent [a]:hover:bg-accent-muted',
        secondary: 'bg-surface-2 text-fg [a]:hover:bg-surface-3',
        destructive:
          'bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-danger focus-visible:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)] [a]:hover:bg-[color-mix(in_srgb,var(--danger)_20%,transparent)]',
        outline:
          'border-border text-fg [a]:hover:bg-surface-1 [a]:hover:text-fg-muted',
        ghost: 'hover:bg-surface-1 hover:text-fg-muted',
        link: 'text-accent underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, badgeVariants }
