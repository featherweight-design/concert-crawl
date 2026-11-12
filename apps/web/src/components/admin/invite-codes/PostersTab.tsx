'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Info,
  Plus,
  Printer,
  ScanLine,
  Scissors,
} from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SectionHead } from '@/components/admin/primitives';
import { downloadBlob } from '@/lib/download-blob';
import { qrSvg, type QrPath } from '@/lib/poster/poster-rule';
import type { PosterVenueData } from '@/lib/poster/load-poster-venues';
import { DENVER_TIME_ZONE } from '@/lib/time';
import { postersHref, type PosterSelection } from '@/lib/poster/posters-href';
import { InviteCodesTabs } from './InviteCodesTabs';
import { NewPosterCodeForm } from './NewPosterCodeForm';
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
const downloadQr = (card: PosterCodeCard & { qr: QrPath }) =>
  downloadBlob(
    new Blob([qrSvg(card.qr)], { type: 'image/svg+xml' }),
    `poster-qr-${card.code}.svg`,
  );

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
  const printable = cards.filter(
    (card): card is PosterCodeCard & { qr: QrPath } => card.qr !== null,
  );
  // A requested code is honoured or refused, never swapped for another: an
  // unprintable one selects nothing and says so. With no request, the newest
  // printable code is picked.
  const [selectedId, setSelectedId] = useState(
    initial.code ?? printable[0]?.id ?? null,
  );
  const [look, setLook] = useState<PosterLook>(initial.look);
  const [tabs, setTabs] = useState(initial.tabs);
  const [formOpen, setFormOpen] = useState(false);
  // A code just minted: the preview stays dimmed on the old one until the
  // revalidated list brings it in, then it is selected.
  const [pendingMintId, setPendingMintId] = useState<string | null>(null);
  const [mintBusy, setMintBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const selected = printable.find((card) => card.id === selectedId) ?? null;
  // A selected code that can't be printed, asked for by the URL or picked
  // and since gone full, is refused. A just-minted code is never selected
  // before it arrives, so it is never refused.
  const refused =
    selectedId !== null && selectedId !== pendingMintId && selected === null;
  const mintArrived =
    pendingMintId !== null &&
    printable.some((card) => card.id === pendingMintId);
  const mintMissing = pendingMintId !== null && !mintBusy && !mintArrived;
  const folded = selected !== null && !listOpen;
  const hiddenFull = cards.filter((card) => card.full).length;

  // The URL follows the selection; with nothing selected it stays as it was.
  useEffect(() => {
    if (!selected) return;
    window.history.replaceState(
      null,
      '',
      postersHref({ code: selected.id, look, tabs }),
    );
  }, [selected, look, tabs]);

  const pick = (id: string) => {
    setSelectedId(id);
    setListOpen(false);
  };

  useEffect(() => {
    if (!mintArrived || pendingMintId === null) return;
    setSelectedId(pendingMintId);
    setPendingMintId(null);
    setFormOpen(false);
  }, [mintArrived, pendingMintId]);

  const closeForm = () => {
    setFormOpen(false);
    setPendingMintId(null);
  };

  return (
    <div className="poster-page pt-page" data-testid="posters-tab">
      <Link href="/admin/invite-codes" prefetch={false} className="pt-back">
        <ArrowLeft size={16} aria-hidden />
        {copy.tabs.label}
      </Link>
      <SectionHead
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <div className="pt-tabs">
            <InviteCodesTabs active="posters" />
          </div>
        }
      />
      <div className="pt-grid">
        <div className="pt-steps">
          <section className="pt-step" aria-labelledby="pt-step-code">
            <div className="pt-step-h">
              <span className="pt-n">1</span>
              <b id="pt-step-code">{copy.steps.code}</b>
              {formOpen ? null : (
                <button
                  type="button"
                  className="pt-link"
                  onClick={() => setFormOpen(true)}
                >
                  <Plus size={14} aria-hidden />
                  {copy.newCode}
                </button>
              )}
            </div>
            {formOpen ? (
              <NewPosterCodeForm
                onCancel={closeForm}
                onMinted={setPendingMintId}
                onBusyChange={setMintBusy}
                notice={mintMissing ? copy.form.mintedMissing : null}
              />
            ) : null}
            {cards.length === 0 ? (
              <p className="pt-note">{copy.noCodes}</p>
            ) : (
              <div
                role="radiogroup"
                aria-labelledby="pt-step-code"
                className="pt-codes"
                data-folded={folded}
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
            {refused ? (
              <p role="alert" className="pt-refused">
                {copy.notPrintable}
              </p>
            ) : null}
            {selected && cards.length > 1 ? (
              <button
                type="button"
                className="pt-more"
                aria-expanded={listOpen}
                onClick={() => setListOpen((open) => !open)}
              >
                {copy.moreCodes(cards.length - 1, hiddenFull)}
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

        {selected || formOpen ? (
          <div className="pt-preview" data-dim={formOpen}>
            <div className="pt-preview-h">
              <span className="pt-mono">{copy.previewLabel}</span>
              <span className="pt-spec" data-testid="poster-preview-spec">
                {tabs ? copy.previewSpec.tabs : copy.previewSpec.full}
              </span>
            </div>
            <div className="pt-mat">
              {selected ? (
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
              ) : null}
              {formOpen ? (
                <p className="pt-mat-note" data-testid="poster-mat-note">
                  {mintMissing
                    ? copy.form.mintedMissing
                    : copy.form.previewNote}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
