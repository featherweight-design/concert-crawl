'use client';

import Link from 'next/link';
import { ChevronLeft, Share2 } from 'lucide-react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { PassportShare } from './lib/use-passport-share';

const COPY = CONSUMER_COPY.passport;

/**
 * The phone's Passport top bar (`more-r3-passport_m`): a back chevron, the
 * title centred, and a share icon that runs the same share as the Share row
 * below the booklet. It replaces the big title block under 1024px; the desktop
 * header is unchanged. The icon is hidden where the device cannot share the
 * image file, like the row's Share button, and its slot stays so the title
 * stays centred.
 */
export const PassportTopBar = ({ share }: { share: PassportShare }) => (
  <div
    className="grid h-[54px] grid-cols-[44px_1fr_44px] items-center lg:hidden"
    data-testid="passport-top-bar"
  >
    <Link
      href="/history"
      aria-label={COPY.topBarBack}
      className="flex h-11 w-11 items-center justify-center text-fg-muted"
    >
      <ChevronLeft size={20} aria-hidden="true" />
    </Link>
    <h1 className="text-center text-[17px] font-extrabold text-fg">
      {COPY.pageTitle}
    </h1>
    {share.canShare ? (
      <button
        type="button"
        onClick={share.share}
        disabled={share.file === null}
        aria-busy={share.preparing}
        aria-label={COPY.topBarShare}
        className="flex h-11 w-11 items-center justify-center text-fg-muted disabled:opacity-60"
      >
        <Share2 size={19} aria-hidden="true" />
      </button>
    ) : (
      <span aria-hidden="true" />
    )}
  </div>
);
