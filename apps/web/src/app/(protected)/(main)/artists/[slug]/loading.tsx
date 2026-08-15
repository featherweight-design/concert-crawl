// Route-level skeleton for the artist page (#1115, PR-E).
//
// This stands in for the ARTIST PAYLOAD only. The Spotify embed (PR-F) has its
// own loading clock on purpose — a third-party iframe must never be able to
// hold the whole page grey.
import React from 'react'

import {
  CrumbSkeleton,
  FollowSkeleton,
  HeroSkeleton,
  ShowsSkeleton,
  TextSkeleton,
} from '@/components/consumer/artist-page/skeletons/Skeletons'
import { AP_RAIL_W } from '@/components/consumer/artist-page/definitions/constants'

const ArtistLoading = () => (
  <main className="ap-page">
    {/* Mobile: the band. Geometry is copied from `HeroBand` deliberately — a
        skeleton that is not the same height as the thing it stands in for is
        the layout-shift lie this file exists to avoid. */}
    <div
      aria-hidden="true"
      className="ap-band-skeleton border-b border-border px-4 pb-[18px] pt-4 md:hidden"
    >
      <div className="mb-3 h-11 w-11" />
      <div className="flex items-start gap-3.5">
        <div className="w-32 shrink-0">
          <HeroSkeleton height={128} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <TextSkeleton width="82%" height={23} />
          <TextSkeleton width="94%" height={11} marginTop={14} />
          <TextSkeleton width="64%" height={11} marginTop={8} />
        </div>
      </div>
    </div>

    <div className="ap-shell">
      {/* Desktop crumb — mirrors ArtistPageContent's own `hidden md:block`
          wrapper. Omitting it dropped the entire grid 38px when content
          landed (name top 98 → 136). Design table §12 requires it here. */}
      <div className="hidden md:block">
        <CrumbSkeleton />
      </div>
      <div className="ap-grid">
        <div className="ap-rail hidden md:block">
          <div style={{ borderRadius: 12, overflow: 'hidden' }}>
            <HeroSkeleton height={AP_RAIL_W} />
          </div>
          {/* Design table §12: on DESKTOP the Follow slot belongs in the rail,
              in the same marginTop:16 box the real control occupies. */}
          <div style={{ marginTop: 16 }}>
            <FollowSkeleton />
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {/* Name and history line, desktop only — on mobile the band above
              carries both, the same split the loaded page makes. */}
          <div className="hidden md:block">
            <TextSkeleton width="60%" height={40} />
            <TextSkeleton width="92%" height={12} marginTop={18} />
            <TextSkeleton width="58%" height={12} marginTop={8} />
          </div>

          {/* Mobile only — the desktop slot is in the rail above. The loaded
              page puts the mobile control here too, so the two agree. This
              skeleton always reserves it: the empty state renders a Follow at
              this viewport as well, so the box is occupied either way. */}
          <div className="ap-block-follow md:hidden">
            <FollowSkeleton />
          </div>

          <div className="mt-[30px] md:mt-[34px]">
            <div className="md:hidden">
              <ShowsSkeleton rows={3} />
            </div>
            <div className="hidden md:block">
              <ShowsSkeleton rows={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
)

export default ArtistLoading
