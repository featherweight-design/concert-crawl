import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface LegalLinksCardProps {
  /** Desktop panels run one step wider than the mobile sheet. */
  variant: 'mobile' | 'desktop';
}

const LegalLinkRow = ({
  label,
  href,
  insetClass,
}: {
  label: string;
  href: string;
  insetClass: string;
}) => (
  <Link
    href={href}
    // ring-inset, not the house ring: the card clips overflow, so an outset
    // ring loses its outer edge against the border.
    className={`flex items-center gap-3 py-4 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal ${insetClass}`}
  >
    <FileText size={16} aria-hidden className="shrink-0 text-fg-muted" />
    <span className="flex-1 text-[16px] font-bold tracking-[-0.005em] text-fg">
      {label}
    </span>
    <ChevronRight size={15} aria-hidden className="shrink-0 text-fg-subtle" />
  </Link>
);

/**
 * Signed in, the user menu drops its Terms/Privacy rows, so this is the only
 * path to our own documents outside the paid checkout panel.
 */
export const LegalLinksCard = ({ variant }: LegalLinksCardProps) => {
  const insetClass = variant === 'mobile' ? 'px-4' : 'px-5';
  const dividerClass = variant === 'mobile' ? 'mx-4' : 'mx-5';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
      <LegalLinkRow
        label={SETTINGS_COPY.legalTerms}
        href={SETTINGS_COPY.legalTermsHref}
        insetClass={insetClass}
      />
      <div className={`h-px bg-border ${dividerClass}`} />
      <LegalLinkRow
        label={SETTINGS_COPY.legalPrivacy}
        href={SETTINGS_COPY.legalPrivacyHref}
        insetClass={insetClass}
      />
    </div>
  );
};
