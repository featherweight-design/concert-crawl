'use client';

// The create sheet. The id is minted here, not on the server, so the patch
// the customer approves is the patch the crew keeps: the artwork is a pure
// function of (crewId, patchSalt), and both travel with the POST.

import { useState, useId, useEffect } from 'react';
import type { CrewSummary } from '@concert-crawl/types';
import { useAuth } from '@clerk/nextjs';

import { ModalShell } from '@/components/consumer/modal-shell';
import { CrewPatch } from '@/components/consumer/crew-patch';
import { createCrew } from '@/lib/crews';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY.create;

/** Reroll mints a fresh id rather than bumping a salt (row P4). */
const mintCrewId = (): string => crypto.randomUUID();

interface CreateCrewSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (crew: CrewSummary) => void;
}

export const CreateCrewSheet = ({
  open,
  onClose,
  onCreated,
}: CreateCrewSheetProps) => {
  const { getToken } = useAuth();
  const nameId = useId();
  const helpId = useId();
  const [crewId, setCrewId] = useState(mintCrewId);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // A closed sheet keeps no state: reopening is a new crew, so it gets a new
  // id and a clean field rather than the last attempt's leftovers.
  useEffect(() => {
    if (open) return;
    setCrewId(mintCrewId());
    setName('');
    setSaving(false);
    setFailed(false);
  }, [open]);

  const trimmed = name.trim();
  const canSubmit = trimmed !== '' && !saving;

  const onSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setFailed(false);
    try {
      const token = await getToken();
      if (token === null) throw new Error('Not signed in');
      const crew = await createCrew(token, { id: crewId, name: trimmed });
      onCreated(crew);
    } catch (err) {
      console.error('CreateCrewSheet: could not create crew', err);
      // The id is kept on failure so a retry produces the patch they saw.
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.title}
      // Sized to its content, up to 85% of the screen, and the body scrolls
      // inside that cap, so "Make the crew" stays reachable on a 320×568 phone
      // (a fixed 62% once put it below the fold).
      sheetHeight="fit"
      surface="crew"
      desktopWidth={520}
      header={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer"
            style={{
              minHeight: 44,
              padding: '0 4px',
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.close}
          </button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-2">
        <div className="flex flex-col gap-1.5">
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--fg)',
            }}
          >
            {COPY.title}
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.sub}
          </p>
        </div>

        {/* The patch, its note, New patch and the help line share one card. */}
        <div
          className="flex items-center gap-4"
          style={{
            padding: 16,
            borderRadius: 18,
            border: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--bg) 35%, transparent)',
          }}
        >
          <CrewPatch crewId={crewId} patchSalt={0} size={76} scale="tile" />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                lineHeight: 1.4,
                color: 'var(--fg)',
              }}
            >
              {COPY.artNote}
            </p>
            <button
              type="button"
              onClick={() => setCrewId(mintCrewId())}
              aria-label={CREWS_COPY.a11y.reroll}
              className="inline-flex w-fit cursor-pointer items-center gap-2"
              style={{
                minHeight: 38,
                padding: '0 16px',
                borderRadius: 999,
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--fg)',
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M13 8a5 5 0 1 1-1.8-3.8" />
                <path d="M13 2.5v3h-3" />
              </svg>
              {COPY.reroll}
            </button>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                lineHeight: 1.45,
                color: 'var(--fg-subtle)',
              }}
            >
              {COPY.rerollHelp}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={nameId}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}
          >
            {COPY.nameLabel}
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder={COPY.namePlace}
            // Mirrors the API's nameSchema so the client and server agree on
            // what is too long (Z5). No visible counter by design.
            maxLength={40}
            aria-describedby={helpId}
            autoComplete="off"
            className="crew-name-input"
            style={{
              minHeight: 44,
              padding: '0 12px',
              borderRadius: 10,
              // `crew_start` / `crew_start_m`: the name field wears the
              // gradient ring (signal, accent, border) on its surface fill.
              background:
                'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
              border: '1px solid transparent',
              color: 'var(--fg)',
              fontFamily: 'var(--font-ui)',
              fontSize: 15,
              fontWeight: 600,
            }}
          />
          <span
            id={helpId}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              color: 'var(--fg-subtle)',
            }}
          >
            {COPY.nameHelp}
          </span>
        </div>

        {failed && (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--warning)',
            }}
          >
            {COPY.failed}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg disabled:cursor-default"
          style={{
            background: canSubmit
              ? 'linear-gradient(90deg, var(--signal), var(--cta-end))'
              : 'var(--surface-2)',
            boxShadow: canSubmit
              ? '0 8px 26px -10px color-mix(in srgb, var(--signal) 70%, transparent)'
              : 'none',
            color: canSubmit ? 'var(--fg-on-accent)' : 'var(--fg-subtle)',
            border: 'none',
            fontFamily: 'var(--font-ui)',
            fontSize: 17,
            fontWeight: 800,
          }}
        >
          {saving ? COPY.submitting : COPY.submit}
        </button>
      </form>
    </ModalShell>
  );
};
