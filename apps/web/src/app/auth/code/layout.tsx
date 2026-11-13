import type { Metadata } from 'next';

import { SHARE_APP_COPY } from '@/components/consumer/share-app/definitions/copy';
import { SC_RATIOS } from '@/components/consumer/share/definitions/ratios';

// The page itself is a client component, so its link preview lives here.
// `/i/<code>` redirects to this route, which makes it what a crawler unfurls
// when someone pastes their invite link. The card names nobody, so it is one
// image for every code. No `og:url`: the preview must not pin a code to the
// shared object.
const IMAGE = '/api/og/invite';

export const metadata: Metadata = {
  title: SHARE_APP_COPY.ogEyebrow,
  description: SHARE_APP_COPY.ogSub,
  openGraph: {
    type: 'website',
    title: SHARE_APP_COPY.ogTitle,
    description: SHARE_APP_COPY.ogSub,
    images: [
      {
        url: IMAGE,
        width: SC_RATIOS.link.width,
        height: SC_RATIOS.link.height,
        alt: SHARE_APP_COPY.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE_APP_COPY.ogTitle,
    description: SHARE_APP_COPY.ogSub,
    images: [IMAGE],
  },
};

export default function InviteCodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
