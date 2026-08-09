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
import type { ComponentType } from 'react'
import type { TierPickerSheetProps } from './TierPickerSheet'

// Annotated rather than inferred: `dynamic` returns a type that names the
// props interface, which tsc cannot write out from a module it only imports.
export const TierPickerSheet: ComponentType<TierPickerSheetProps> = dynamic(
  () => import('./TierPickerSheet').then((mod) => mod.TierPickerSheet),
  { ssr: false },
)
