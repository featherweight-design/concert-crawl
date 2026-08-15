/**
 * One radius per slot class, product-wide. A slot picks its class from its
 * rendered size, not from the component that happens to draw it, so a 56px
 * tile looks the same whether it sits in a row or in a card.
 */
export const SLOT_RADIUS = {
  row: 8,
  panel: 12,
  card: 14,
  avatar: 999,
} as const

/**
 * The frame every slot wears. Inset rather than a border so it costs no layout
 * box, and applied to photographs and generated art alike — it is a property of
 * the slot, not of what happens to be inside it.
 */
export const SLOT_HAIRLINE =
  'inset 0 0 0 1px color-mix(in oklch, var(--fg) 12%, transparent)'

/** The taste-pick row's floor. The row owns the height above it (#763 r4). */
export const FLEX_ART_MIN_HEIGHT = 116
