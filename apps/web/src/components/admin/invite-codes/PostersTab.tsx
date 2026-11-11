'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  Info,
  Printer,
  ScanLine,
  Scissors,
} from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SectionHead } from '@/components/admin/primitives';
import { qrSvg, type QrPath } from '@/lib/poster/poster-rule';
import type { PosterVenueData } from '@/lib/poster/load-poster-venues';
import { DENVER_TIME_ZONE } from '@/lib/time';
import {
  postersHref,
  type PosterSelection,
} from '@/app/(protected)/admin/invite-codes/posters/posters-href';
import { InviteCodesTabs } from './InviteCodesTabs';
import { PosterFit } from './PosterFit';
import { PosterSheet, type PosterLook } from './PosterSheet';

/** One live multi-seat code, as the picker shows it. */
export interface PosterCodeCard {
  id: string;
  code: string;
  label: string | null;
  taken: number;
  max: number;
  expiresAt: string | null;
  /** Every seat taken: listed, faded, never picked. */
  full: boolean;
  /** What the QR encodes. */
  url: string;
  /** Drawn on the server for a printable code; null for a full one. */
  qr: QrPath | null;
}

interface PostersTabProps {
  cards: PosterCodeCard[];
  typedUrl: string;
  venues: PosterVenueData;
  initial: PosterSelection;
}

const copy = ADMIN_COPY.inviteCodes.poster;
const LOOKS: PosterLook[] = ['night', 'paper'];

const expiryDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: DENVER_TIME_ZONE,
});

const expiry = (expiresAt: string | null) =>
  expiresAt == null
    ? copy.expiresNever
    : copy.expiresOn(expiryDate.format(new Date(expiresAt)));

/** Saves the selected code's QR as an SVG file, black on white. */
const downloadQr = (card: PosterCodeCard & { qr: QrPath }) => {
  const href = URL.createObjectURL(
    new Blob([qrSvg(card.qr)], { type: 'image/svg+xml' }),
  );
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `poster-qr-${card.code}.svg`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};

/**
 * The Posters tab: Code, Look, Print on the left, the real sheet at scale on
 * the right. On a phone the picker folds to the selected card, Look becomes a
 * segmented control and QR plus Print pin to the bottom (`poster.css`).
 * The root carries `poster-page`, so the scoped print CSS prints the sheet
 * alone.
 */
export function PostersTab({
  cards,
  typedUrl,
  venues,
  initial,
}: PostersTabProps) {
  const [selectedId, setSelectedId] = useState(initial.code);
  const [look, setLook] = useState<PosterLook>(initial.look);
  const [tabs, setTabs] = useState(initial.tabs);
  const [listOpen, setListOpen] = useState(false);

  const printable = cards.filter(
    (card): card is PosterCodeCard & { qr: QrPath } => card.qr !== null,
  );
  const selected =
    printable.find((card) => card.id === selectedId) ?? printable[0] ?? null;
  const fullCount = cards.filter((card) => card.full).length;

  useEffect(() => {
    window.history.replaceState(
      null,
      '',
      postersHref({ code: selected?.id ?? null, look, tabs }),
    );
  }, [selected?.id, look, tabs]);

  const pick = (id: string) => {
    setSelectedId(id);
    setListOpen(false);
  };

  return (
    <div className="poster-page pt-page" data-testid="posters-tab">
      <SectionHead
        title={copy.title}
        subtitle={copy.subtitle}
        actions={<InviteCodesTabs active="posters" />}
      />
      <div className="pt-grid">
        <div className="pt-steps">
          <section className="pt-step" aria-labelledby="pt-step-code">
            <div className="pt-step-h">
              <span className="pt-n">1</span>
              <b id="pt-step-code">{copy.steps.code}</b>
            </div>
            {cards.length === 0 ? (
              <p className="pt-note">{copy.noCodes}</p>
            ) : (
              <div
                role="radiogroup"
                aria-labelledby="pt-step-code"
                className="pt-codes"
                data-open={listOpen}
              >
                {cards.map((card) => {
                  const on = card.id === selected?.id;
                  return (
                    <label
                      key={card.id}
                      className="pt-card"
                      data-on={on}
                      data-full={card.full}
                      data-testid="poster-code-card"
                    >
                      <input
                        type="radio"
                        name="poster-code"
                        value={card.id}
                        checked={on}
                        disabled={card.full}
                        onChange={() => pick(card.id)}
                      />
                      <span className="pt-card-row">
                        <span className="pt-card-main">
                          {card.label ? <b>{card.label}</b> : null}
                          <code>{card.code}</code>
                        </span>
                        <span className="pt-radio" aria-hidden>
                          {on ? <Check size={13} /> : null}
                        </span>
                      </span>
                      <span className="pt-bar" aria-hidden>
                        <i
                          style={{
                            width: `${Math.min(100, (card.taken / card.max) * 100)}%`,
                          }}
                        />
                      </span>
                      <span className="pt-card-row pt-meta">
                        <span>{copy.seatsTaken(card.taken, card.max)}</span>
                        {card.full ? null : (
                          <span>{expiry(card.expiresAt)}</span>
                        )}
                      </span>
                      {card.full ? (
                        <span className="pt-meta">{copy.full}</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}
            {cards.length > 1 ? (
              <button
                type="button"
                className="pt-more"
                aria-expanded={listOpen}
                onClick={() => setListOpen((open) => !open)}
              >
                {copy.moreCodes(cards.length - 1, fullCount)}
                <ChevronDown size={14} aria-hidden />
              </button>
            ) : null}
            <p className="pt-note">
              <Info size={13} aria-hidden />
              {copy.personalNote}
            </p>
          </section>

          <section className="pt-step" aria-labelledby="pt-step-look">
            <div className="pt-step-h">
              <span className="pt-n">2</span>
              <b id="pt-step-look">{copy.steps.look}</b>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="pt-step-look"
              className="pt-looks"
            >
              {LOOKS.map((key) => (
                <label key={key} className="pt-look" data-on={look === key}>
                  <input
                    type="radio"
                    name="poster-look"
                    value={key}
                    checked={look === key}
                    onChange={() => setLook(key)}
                  />
                  <span className="pt-thumb" data-look={key} aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="pt-copy">
                    <b>{copy.look[key].name}</b>
                    <small>{copy.look[key].hint}</small>
                  </span>
                  <span className="pt-radio" aria-hidden>
                    {look === key ? <Check size={13} /> : null}
                  </span>
                </label>
              ))}
            </div>
            <label className="pt-toggle">
              <Scissors size={18} aria-hidden className="pt-toggle-ic" />
              <span className="pt-copy">
                <b>{copy.tearTabs.name}</b>
                <small>{copy.tearTabs.hint}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={tabs}
                onChange={(evt) => setTabs(evt.target.checked)}
              />
            </label>
          </section>

          <section className="pt-step pt-print" aria-labelledby="pt-step-print">
            <div className="pt-step-h">
              <span className="pt-n">3</span>
              <b id="pt-step-print">{copy.steps.print}</b>
            </div>
            <div className="pt-actions">
              <button
                type="button"
                className="pt-ghost"
                disabled={!selected}
                onClick={() => selected && downloadQr(selected)}
              >
                <Download size={16} aria-hidden />
                <span className="pt-wide">{copy.qrDownload}</span>
                <span className="pt-narrow">{copy.qrShort}</span>
              </button>
              <button
                type="button"
                className="pt-solid"
                disabled={!selected}
                onClick={() => window.print()}
              >
                <Printer size={16} aria-hidden />
                {copy.print}
              </button>
            </div>
            <div className="pt-tips">
              <span className="pt-mono">{copy.printTipsHeading}</span>
              <ul>
                {copy.printTips.map((tip) => (
                  <li key={tip}>
                    <Check size={13} aria-hidden />
                    {tip}
                  </li>
                ))}
              </ul>
              <p>
                <ScanLine size={14} aria-hidden />
                {copy.scanTip}
              </p>
            </div>
          </section>
        </div>

        {selected ? (
          <div className="pt-preview">
            <div className="pt-preview-h">
              <span className="pt-mono">{copy.previewLabel}</span>
              <span className="pt-spec" data-testid="poster-preview-spec">
                {tabs ? copy.previewSpec.tabs : copy.previewSpec.full}
              </span>
            </div>
            <div className="pt-mat">
              <PosterFit>
                <PosterSheet
                  url={selected.url}
                  typedUrl={typedUrl}
                  code={selected.code}
                  qr={selected.qr}
                  seats={selected.max - selected.taken}
                  venueCount={venues.venueCount}
                  venueNames={venues.venueNames}
                  moreVenues={venues.moreVenues}
                  look={look}
                  tabs={tabs}
                />
              </PosterFit>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
