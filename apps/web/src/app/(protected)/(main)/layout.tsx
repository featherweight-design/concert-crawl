import { AppHeader } from '@/components/consumer/app-header'
import { AccountMenuProvider } from '@/components/consumer/user-menu'
import { BottomNav } from '@/components/consumer/bottom-nav'
import { InstallSlot } from '@/components/pwa/InstallSlot'
import { OfflinePill } from '@/components/pwa/OfflinePill'
import { ReturnSeamReplay } from '@/components/consumer/return-seam/ReturnSeamReplay'
import { Suspense } from 'react'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // overflow-x-clip lives on this in-flow block that wraps all page chrome —
    // not on <html> or the flex-item <main> — to contain the Browse "Based on
    // your taste" carousel's full-bleed overflow (#763's -mx-4 + overflow-x-auto
    // shelf). An <html>-level clip (#1156) cropped the header wordmark and left a
    // dead gap once the document had widened; a clip on the column-flex <main>
    // (#1149) never caught overflow that propagated above it. `clip` (not
    // `hidden`) keeps the sticky desktop header working; the fixed
    // BottomNav/overlays are positioned against the viewport, so an ancestor
    // overflow:clip never hides them.
    <div className="flex min-h-screen flex-col overflow-x-clip bg-bg">
      {/* Wraps header and bottom nav so their two account triggers share one
          open state — otherwise a mobile tap could stack two menu sheets. */}
      <AccountMenuProvider>
        <AppHeader
          rightSlots={
            <>
              <OfflinePill />
              <InstallSlot />
            </>
          }
        />
        {/* Mounted once here rather than per destination, so every page the
            post-signup seam can land on replays through the same code path.
            Suspense because it reads useSearchParams inside a layout that is
            otherwise statically rendered. */}
        <Suspense fallback={null}>
          <ReturnSeamReplay />
        </Suspense>
        {children}
        <BottomNav />
      </AccountMenuProvider>
    </div>
  )
}
