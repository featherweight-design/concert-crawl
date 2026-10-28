import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { CCTip } from '@/components/ui/cc-tip'

const SETTINGS_COPY = CONSUMER_COPY.settings

interface CredChipProps {
  cred: number
  size?: 'sm' | 'md'
  showTooltip?: boolean
}

export function CredChip({
  cred,
  size = 'md',
  showTooltip = false,
}: CredChipProps) {
  const isZero = cred === 0
  const numSize = size === 'sm' ? 'text-[11px]' : 'text-[13px]'
  const labelSize = size === 'sm' ? 'text-[9px]' : 'text-[9.5px]'
  const padding = size === 'sm' ? 'px-[7px] py-[3px]' : 'px-[9px] py-[4px]'
  const gap = size === 'sm' ? 'gap-[5px]' : 'gap-[6px]'

  const chip = (
    <span
      className={`inline-flex shrink-0 items-baseline rounded-full border ${padding} ${gap}`}
      style={{
        background: isZero
          ? 'var(--surface-2)'
          : 'color-mix(in oklch, var(--accent) 12%, transparent)',
        borderColor: isZero
          ? 'var(--border)'
          : 'color-mix(in oklch, var(--accent) 50%, transparent)',
        color: isZero ? 'var(--fg-subtle)' : 'var(--accent)',
      }}
    >
      <span className={`${numSize} font-black leading-none tracking-[-0.02em]`}>
        {cred.toLocaleString()}
      </span>
      <span
        className={`${labelSize} font-bold uppercase leading-none tracking-[0.14em]`}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {SETTINGS_COPY.credChipLabel}
      </span>
    </span>
  )

  if (!showTooltip) return chip

  // The chip itself opens the explainer: a popover on desktop, a sheet on
  // touch, both reachable by keyboard, which a native title= never was.
  return (
    <CCTip
      tip="cred"
      triggerLabel={SETTINGS_COPY.credChipTipLabel(cred.toLocaleString())}
      placement="bottom"
      align="start"
    >
      {chip}
    </CCTip>
  )
}
