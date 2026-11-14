'use client';

import {
  createContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, MoreHorizontal } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, AdminSheet } from '@/components/admin/primitives';
import { useDialogKeyboard } from '@/components/admin/primitives/useDialogKeyboard';
import { venueTabHref } from '@/lib/admin/venue-tabs';
import { MenuItem, SnoozeOptions } from './SnoozeMenu';

const COPY = ADMIN_COPY.needsYou;

/**
 * Where a panel's answers land on the phone: the page's pinned footer. A panel
 * keeps deciding which answers it offers; `AnswerButtons` portals them here.
 * Null on desktop, where the answers stay inside the panel.
 */
export const PhoneFooterContext = createContext<HTMLElement | null>(null);

interface PhoneItemPageProps {
  /** A `KindLabel`, above the title. */
  eyebrow: ReactNode;
  title: string;
  /** The ⋯ sheet's heading: the item's short name. */
  menuTitle: string;
  venue: { id: string; name: string } | null;
  /** An answer or snooze is in flight: the page and ⋯ hold still. */
  busy: boolean;
  onClose: () => void;
  onSnooze: (until: string) => void;
  onNotUseful?: ((reason: string) => void) | undefined;
  /** The warning and venue the snooze steps name. */
  about?: { warning: string; venue: string | null };
  children: ReactNode;
}

/**
 * `02/an-item-mobile`: on the phone an item opens as a full page, not a panel
 * over the list. The back row ("‹ Needs you") and ⋯ sit on top, the answers pin
 * to a footer, and ⋯ opens `01-snooze/item-menu-m`.
 */
export const PhoneItemPage = ({
  eyebrow,
  title,
  menuTitle,
  venue,
  busy,
  onClose,
  onSnooze,
  onNotUseful,
  about,
  children,
}: PhoneItemPageProps) => {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState<'menu' | 'date' | 'reason'>('menu');
  // The sheet sits inside the page, so the page's trap already holds it. Escape
  // is the sheet's while it is open, and nobody's mid-request.
  useDialogKeyboard(pageRef, onClose, { dismissible: !menuOpen && !busy });
  // The trap opens on the first control, the back link, and a script focus
  // draws its ring on load. Settle focus on the page itself (no ring, still
  // inside the dialog); the first Tab then lands on the back link.
  useEffect(() => {
    pageRef.current?.focus();
  }, []);

  return (
    <div
      ref={pageRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="phone-item-page"
      tabIndex={-1}
      style={{
        outline: 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 12px 4px 16px',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          data-testid="phone-item-back"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 0',
            border: 'none',
            background: 'transparent',
            color: 'var(--fg-muted)',
            fontFamily: 'inherit',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={16} aria-hidden />
          {COPY.title}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          disabled={busy}
          aria-label={COPY.itemPage.more}
          aria-haspopup="dialog"
          data-testid="phone-item-more"
          style={{
            display: 'flex',
            padding: 8,
            border: 'none',
            background: 'transparent',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
          }}
        >
          <MoreHorizontal size={20} aria-hidden />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '8px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex' }}>{eyebrow}</div>
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 21,
            fontWeight: 800,
            lineHeight: 1.25,
            color: 'var(--fg)',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </h2>
        <PhoneFooterContext.Provider value={footer}>
          {children}
        </PhoneFooterContext.Provider>
      </div>

      <div
        ref={setFooter}
        data-testid="phone-item-footer"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '12px 16px calc(24px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}
      />

      {menuOpen && (
        <AdminSheet
          // A date or reason step carries its own title and Back button, as
          // `01-snooze/snooze-until-a-date-m` draws it.
          title={step === 'menu' ? menuTitle : ''}
          label={menuTitle}
          onClose={() => {
            setMenuOpen(false);
            setStep('menu');
          }}
          {...(step === 'menu'
            ? {
                footer: (
                  <AdminButton
                    variant="outline"
                    onClick={() => setMenuOpen(false)}
                  >
                    {COPY.itemPage.close}
                  </AdminButton>
                ),
              }
            : {})}
        >
          <div role="group" aria-label={COPY.snooze.menuLabel}>
            <SnoozeOptions
              sheet
              onStep={setStep}
              onSnooze={(until) => {
                setMenuOpen(false);
                onSnooze(until);
              }}
              onNotUseful={
                onNotUseful
                  ? (reason) => {
                      setMenuOpen(false);
                      onNotUseful(reason);
                    }
                  : undefined
              }
              {...(about ? { about } : {})}
              afterDate={
                venue ? (
                  <MenuItem
                    icon={<MapPin size={17} />}
                    title={COPY.itemPage.openVenue(venue.name)}
                    sub={COPY.itemPage.openVenueSub}
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(venueTabHref(venue.id, 'runs'));
                    }}
                  />
                ) : null
              }
            />
          </div>
        </AdminSheet>
      )}
    </div>
  );
};
