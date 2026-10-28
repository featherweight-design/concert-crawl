'use client'

// The tier picker, loaded on demand.
//
// `TierPickerSheet` pulls `CheckoutPanel` and therefore `@stripe/stripe-js`
// behind it, and every surface that offers the picker renders it closed on
// first paint. Importing it statically puts the whole checkout bundle on the
// critical path of routes whose visitors mostly never open it.
//
// `ssr: false` for the same reason the sheet is closed: a modal that renders
// nothing on the server gains nothing from being server-rendered.
//
// This lives in one module rather than a `dynamic()` call per consumer so the
// reasoning is written once and a consumer opts in by changing an import path.

import dynamic from 'next/dynamic'
import { createElement, useState, type ComponentType } from 'react'
import type { TierPickerSheetProps } from './TierPickerSheet'

// Annotated rather than inferred: `dynamic` returns a type that names the
// props interface, which tsc cannot write out from a module it only imports.
const DynamicTierPickerSheet: ComponentType<TierPickerSheetProps> = dynamic(
  () => import('./TierPickerSheet').then((mod) => mod.TierPickerSheet),
  { ssr: false },
)

// Mounting a `dynamic` component starts its import, even closed. Most hosts
// render the sheet with `open={false}` from first paint, so the wrapper holds
// it back until the first open; once mounted it stays mounted, so closing
// still runs the sheet's own exit path (#1332).
export const TierPickerSheet = (props: TierPickerSheetProps) => {
  const [hasOpened, setHasOpened] = useState(props.open)
  if (props.open && !hasOpened) setHasOpened(true)
  return hasOpened || props.open
    ? createElement(DynamicTierPickerSheet, props)
    : null
}
