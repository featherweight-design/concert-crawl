// Route-level skeleton for the artist page (#1115, PR-E).
//
// This stands in for the ARTIST PAYLOAD only. The Spotify embed (PR-F) has its
// own loading clock on purpose — a third-party iframe must never be able to
// hold the whole page grey.
import React from 'react'

import {
  CrumbSkeleton,
  HeroSkeleton,
  ShowsSkeleton,
  TextSkeleton,
} from '@/components/consumer/artist-page/skeletons/Skeletons'
import { AP_HERO_H } from '@/components/consumer/artist-page/definitions/constants'

const ArtistLoading = () => (
  <main className="ap-page">
    {/* Mobile: the full-bleed plate. */}
    <div className="ap-hero-wrap md:hidden">
      <HeroSkeleton height={AP_HERO_H.wide} className="ap-hero" />
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
          <div style={{ borderRadius: 14, overflow: 'hidden' }}>
            <HeroSkeleton height={320} />
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {/* Name. */}
          <div className="md:hidden">
            <TextSkeleton width="72%" height={30} />
          </div>
          <div className="hidden md:block">
            <TextSkeleton width="60%" height={40} />
          </div>

          {/* History line — two rows of prose. */}
          <div className="md:hidden">
            <TextSkeleton width="94%" height={11} marginTop={16} />
            <TextSkeleton width="66%" height={11} marginTop={8} />
          </div>
          <div className="hidden md:block">
            <TextSkeleton width="92%" height={12} marginTop={18} />
            <TextSkeleton width="58%" height={12} marginTop={8} />
          </div>

          {/* NOTE (PR-F): the Follow control's 48px slot is deliberately NOT
              reserved here. PR-E renders no Follow button at either viewport,
              so reserving it made the skeleton 68px taller than the page it
              stands in for — the same layout-shift lie the missing crumb was.
              Design table §12 does list a Follow bar; that row describes the
              finished page. PR-F must restore it alongside the button, and per
              §12 the DESKTOP slot belongs in the left rail (in its marginTop:16
              slot), not in this content column. */}

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
