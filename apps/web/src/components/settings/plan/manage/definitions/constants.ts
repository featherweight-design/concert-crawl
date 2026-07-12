// Layout constants for the #780 manage sheet + lifecycle flows (PR 4.5),
// verbatim from the design tables (lifecycle-manage.md / lifecycle-flows.md).

import type { ManageSurface } from './types'

// Desktop modal widths per surface (mobile is always a full-width sheet).
export const SURFACE_DESKTOP_WIDTH: Record<ManageSurface, number> = {
  manage: 460,
  cancel: 460,
  downgrade: 440,
  upgrade: 440,
}

// Matches ModalShell's layer contract: scrim 90, dialog 100 (app bar and
// bottom nav sit at z-40, the feature-drop pill at z-80).
export const SURFACE_SCRIM_Z_INDEX = 90
export const SURFACE_DIALOG_Z_INDEX = 100
