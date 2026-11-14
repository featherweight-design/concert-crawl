'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminCard,
  AdminCardRow,
} from '@/components/admin/primitives';
import { TINT_BUTTON } from '@/components/admin/artists/artist-styles';
import { AddPricePanel } from '@/components/admin/prices/AddPricePanel';
import { EditPricePanel } from '@/components/admin/prices/EditPricePanel';
import { pricesApi } from '@/components/admin/prices/prices-api';
import { submittedApi } from '@/components/admin/prices/submitted-api';
import { refusedStatus } from '@/components/admin/invite-codes/codes-api';
import { shortDate } from '@/components/admin/venues/overview/overview-rules';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { formatPrice } from '../list/events-rules';
import type { EventDetail } from './event-detail';

const COPY = ADMIN_COPY.eventEdit.price;
const NONE = ADMIN_COPY.eventEdit.none;
const ADD = ADMIN_COPY.pricesPage.add;
const EDIT = ADMIN_COPY.pricesSubmitted.edit;

/** "larimerlounge.com" from a safe ticket URL; `null` for none. */
const hostOf = (url: string | null): string | null => {
  if (!isSafeHttpUrl(url)) return null;
  return new URL(url).hostname.replace(/^www\./, '');
};

/**
 * The Price card (`06/event-edit`): the listed price, the Submitted prices
 * that stand, the ticket page, and Edit price, which opens the shared price
 * sheet (`06/edit-price-desktop`, 4b#19): the admin's own submission when
 * there is one, else a new one. Either saves as the admin's submission, so
 * Submitted prices keeps the history.
 */
export const PriceCard = ({
  detail,
  phone,
  past,
  onSaved,
}: {
  detail: EventDetail;
  phone: boolean;
  past: boolean;
  /** Re-reads the page once a price is saved. */
  onSaved: () => void;
}) => {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const host = hostOf(detail.ticketUrl);
  const mine = detail.mySubmission;
  const close = () => setOpen(false);

  return (
    <AdminCard title={COPY.title} phone={phone} testId="event-edit-price">
      <div>
        <AdminCardRow label={COPY.listed}>
          <b>{formatPrice(detail.priceMin, detail.priceMax) ?? NONE}</b>
        </AdminCardRow>
        <AdminCardRow label={COPY.from}>
          {COPY.fromValue(detail.submittedPriceCount)}
        </AdminCardRow>
        <AdminCardRow label={COPY.ticketPage}>
          {host === null
            ? NONE
            : COPY.ticketValue(
                host,
                detail.priceRetrievedAt === null
                  ? null
                  : shortDate(detail.priceRetrievedAt),
              )}
        </AdminCardRow>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!past && (
          <AdminButton
            data-testid="event-edit-price-edit"
            onClick={() => setOpen(true)}
            style={{ ...TINT_BUTTON, height: 32, padding: '0 12px' }}
          >
            {COPY.edit}
          </AdminButton>
        )}
        <Link
          href="/admin/prices?tab=submitted"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--fg-muted)',
            textDecoration: 'none',
          }}
        >
          <ChevronRight size={14} aria-hidden />
          {COPY.submitted}
        </Link>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
        {COPY.note}
      </div>
      {open && mine !== null && (
        <EditPricePanel
          row={{
            title: detail.title,
            venueName: detail.venueName,
            date: detail.date,
            priceMin: mine.priceMin,
            priceMax: mine.priceMax,
          }}
          onClose={close}
          onSave={async (priceMin, priceMax) => {
            try {
              await submittedApi(getToken).editPrice(
                mine.id,
                priceMin,
                priceMax,
              );
            } catch (err) {
              const status = refusedStatus(err);
              return status === 409 || status === 404
                ? EDIT.notEditable
                : EDIT.saveFailed;
            }
            close();
            onSaved();
            return null;
          }}
        />
      )}
      {open && mine === null && (
        <AddPricePanel
          single
          row={{
            eventId: detail.id,
            title: detail.title,
            venueName: detail.venueName,
            venueSlug: detail.venueSlug ?? '',
            date: detail.date,
            ticketUrl: detail.ticketUrl,
            watching: detail.watchingCount,
          }}
          onClose={close}
          onSubmit={async (price) => {
            try {
              await pricesApi(getToken).addPrice(price);
            } catch (err) {
              return {
                ok: false,
                error:
                  refusedStatus(err) === 409
                    ? ADD.alreadyPriced
                    : ADD.saveFailed,
              };
            }
            close();
            onSaved();
            return { ok: true };
          }}
        />
      )}
    </AdminCard>
  );
};
