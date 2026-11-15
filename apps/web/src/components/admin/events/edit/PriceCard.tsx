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
import { adminPriceRange } from '@/lib/admin/price-format';
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
 * sheet (`06/edit-price-desktop`, 4b#19): on a priced show it replaces the
 * listed price; on an unpriced one it edits the admin's own submission when
 * there is one, else adds a new one. Each saves as the admin's submission, so
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
  // The admin edit route takes a pending or corroborated price; one under an
  // open Price check waits for the check.
  const mine =
    detail.mySubmission !== null &&
    (detail.mySubmission.status === 'pending' ||
      detail.mySubmission.status === 'corroborated')
      ? detail.mySubmission
      : null;
  // Always on (`06/edit-price-desktop`). On a priced show it always replaces
  // the listed price, as the admin's own, without telling the fans (Hugh,
  // 2026-11-14), even over the admin's own pending or corroborated price:
  // editing that one alone could leave a cheaper fan price listed. On a show
  // with no listed price it edits the admin's own price, else adds one.
  const replacing = detail.priceMin !== null;
  const editingMine = !replacing && mine !== null ? mine : null;
  // No client-side hold for a Price check: a 'disputed' row may be an admin
  // denial rather than an open check, so the server decides and its 409
  // shows the Price check line.
  const close = () => setOpen(false);

  return (
    <AdminCard title={COPY.title} phone={phone} testId="event-edit-price">
      <div>
        <AdminCardRow label={COPY.listed}>
          <b>{adminPriceRange(detail.priceMin, detail.priceMax) ?? NONE}</b>
        </AdminCardRow>
        <AdminCardRow label={COPY.from}>
          {COPY.fromValue(detail.submittedPriceCount)}
        </AdminCardRow>
        {/* A past show's price is a record (`04/past-show-d`, `36/past-show-m`):
            no ticket page, no Edit price, no link out. */}
        {!past && (
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
        )}
      </div>
      {!past && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AdminButton
            data-testid="event-edit-price-edit"
            onClick={() => setOpen(true)}
            style={{ ...TINT_BUTTON, height: 32, padding: '0 12px' }}
          >
            {COPY.edit}
          </AdminButton>
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
      )}
      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
        {past ? ADMIN_COPY.eventEdit.past.priceRecord : COPY.note}
      </div>
      {open && (editingMine !== null || replacing) && (
        <EditPricePanel
          single
          row={{
            title: detail.title,
            venueName: detail.venueName,
            date: detail.date,
            priceMin: editingMine?.priceMin ?? detail.priceMin ?? '',
            priceMax:
              editingMine !== null ? editingMine.priceMax : detail.priceMax,
          }}
          onClose={close}
          onSave={async (priceMin, priceMax) => {
            try {
              if (editingMine !== null) {
                await submittedApi(getToken).editPrice(
                  editingMine.id,
                  priceMin,
                  priceMax,
                );
              } else {
                await submittedApi(getToken).replaceListedPrice(
                  detail.id,
                  priceMin,
                  priceMax,
                );
              }
            } catch (err) {
              const status = refusedStatus(err);
              // The replace route's 409 is only ever an open Price check.
              if (editingMine === null && status === 409) {
                return COPY.priceCheckOpen;
              }
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
      {open && mine === null && detail.priceMin === null && (
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
