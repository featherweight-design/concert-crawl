'use client';

import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ExternalLink, RefreshCw, Reply } from 'lucide-react';
import type { AdminFeedbackItem } from '@concert-crawl/types';
import {
  AdminButton,
  KindLabel,
  SaveFailedToast,
  SidePanel,
  StatusBadge,
  adminButtonVariantStyle,
} from '@/components/admin/primitives';
import {
  PhoneFooterContext,
  PhoneItemPage,
} from '@/components/admin/needs-you/PhoneItemPage';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import { personHref } from '@/components/admin/people/people-rules';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { doneLine, kindOf } from './feedback-list-rules';
import {
  fieldsOf,
  headOf,
  isDoneItem,
  screenshotOf,
  showsReply,
  whenLine,
  type Field,
} from './feedback-item-rules';
import { githubHref } from './github-issue';

const COPY = ADMIN_COPY.feedback.item;
const MONO = "'JetBrains Mono', monospace";
/** The note saves this long after the last keystroke ("Saved as you type"). */
const NOTE_DEBOUNCE_MS = 800;

/** A refused write, shown in the item with Try again (`07/save-failed`). */
export interface ItemFailure {
  title: string;
  saved: string;
  retry: () => void;
}

interface FeedbackItemViewProps {
  item: AdminFeedbackItem;
  isPhone: boolean;
  /** A status write is in flight: the actions and close hold still. */
  busy: boolean;
  failure: ItemFailure | null;
  onDismissFailure: () => void;
  onClose: () => void;
  onMarkDone: () => void;
  onReopen: () => void;
  onNotes: (notes: string) => void;
}

/** Shows a long id as its ends, as `02/error-report-d` draws "4b1e…09ac". */
const shortId = (value: string): string =>
  value.length > 12 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value;

const CopyValue = ({ field }: { field: Field }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const label = COPY.fields[field.key];
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'baseline', minWidth: 0 }}
    >
      <span
        title={field.value}
        style={{ fontFamily: MONO, fontSize: 12, overflowWrap: 'anywhere' }}
      >
        {field.key === 'sentryEvent' ? shortId(field.value) : field.value}
      </span>
      <button
        type="button"
        aria-label={COPY.copyLabel(label)}
        data-testid={`copy-${field.key}`}
        onClick={() => {
          navigator.clipboard
            .writeText(field.value)
            .then(() => setCopied(true))
            .catch(() => undefined);
        }}
        style={{
          marginLeft: 8,
          padding: 0,
          border: 'none',
          background: 'none',
          font: 'inherit',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--signal)',
          cursor: 'pointer',
        }}
      >
        {copied ? COPY.copied : COPY.copy}
      </button>
    </span>
  );
};

/** One line of `02/error-report-d`: 8px padding over a hairline. */
const FieldLine = ({ field }: { field: Field }) => (
  <div
    data-testid={`feedback-field-${field.key}`}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      padding: '8px 0',
      borderTop: '1px solid var(--border)',
      fontSize: 13,
    }}
  >
    <span style={{ flex: 'none', color: 'var(--fg-muted)' }}>
      {COPY.fields[field.key]}
    </span>
    <span
      style={{
        minWidth: 0,
        textAlign: 'right',
        color: 'var(--fg)',
        overflowWrap: 'anywhere',
      }}
    >
      {field.mono ? (
        <CopyValue field={field} />
      ) : field.key === 'from' && field.href ? (
        <a
          href={field.href}
          style={{ color: 'var(--signal)', textDecoration: 'none' }}
        >
          {field.value}
        </a>
      ) : field.href ? (
        <SafeExternalLink
          href={field.href}
          style={{ color: 'var(--signal)', textDecoration: 'none' }}
        >
          {field.value}
        </SafeExternalLink>
      ) : (
        field.value
      )}
    </span>
  </div>
);

const Screenshot = ({ src, phone }: { src: string; phone: boolean }) => (
  <SafeExternalLink
    href={src}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: phone ? 180 : 200,
      borderRadius: 12,
      border: '1px solid var(--border)',
      background: 'linear-gradient(160deg, var(--surface-2), var(--bg))',
      overflow: 'hidden',
    }}
  >
    {/* eslint-disable-next-line @next/next/no-img-element -- the reporter's own image, a stored URL or inline data */}
    <img
      src={src}
      alt={COPY.screenshotAlt}
      data-testid="feedback-screenshot"
      style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
    />
  </SafeExternalLink>
);

/** The note: saved as you type, and on leaving the field. */
const NoteField = ({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (notes: string) => void;
}) => {
  const id = useId();
  const [notes, setNotes] = useState(initial);
  const saved = useRef(initial);
  const latest = useRef(initial);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);
  const flush = useCallback(() => {
    if (latest.current === saved.current) return;
    saved.current = latest.current;
    saveRef.current(latest.current);
  }, []);
  useEffect(() => {
    if (notes === saved.current) return undefined;
    const timer = setTimeout(flush, NOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [notes, flush]);
  // Closing the item mid-sentence still keeps what was typed.
  useEffect(() => flush, [flush]);
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--fg-muted)',
        }}
      >
        {COPY.note}
      </label>
      <textarea
        id={id}
        value={notes}
        rows={1}
        onChange={(evt) => {
          latest.current = evt.target.value;
          setNotes(evt.target.value);
        }}
        onBlur={flush}
        placeholder={COPY.notePlaceholder}
        className="placeholder:text-[var(--fg-subtle)]"
        style={{
          display: 'block',
          width: '100%',
          minHeight: 38,
          padding: '9px 12px',
          borderRadius: 10,
          border: '1px solid var(--border-strong)',
          background: 'var(--bg)',
          fontFamily: 'inherit',
          fontSize: 13.5,
          lineHeight: 1.4,
          color: 'var(--fg)',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};

/** On the phone the actions pin to the page's footer, as Needs you's do. */
const PhoneFooter = ({ children }: { children: ReactNode }) => {
  const footer = useContext(PhoneFooterContext);
  return footer ? createPortal(children, footer) : null;
};

/**
 * P47-19 4b: one feedback item. Desktop opens it in the side panel over the
 * list (`07/a-feedback-item-in-flow`); the phone as a page with a back row
 * and pinned actions (`07/feedback-item-mobile`). Addendum 7 draws the error
 * report and the venue suggestion; addendum 3 the Done item and Reopen.
 */
export const FeedbackItemView = ({
  item,
  isPhone,
  busy,
  failure,
  onDismissFailure,
  onClose,
  onMarkDone,
  onReopen,
  onNotes,
}: FeedbackItemViewProps) => {
  const replyLineId = useId();
  const kind = kindOf(item);
  const done = isDoneItem(item);
  const { title, quote } = headOf(item);
  const fields = fieldsOf(item, item.userId ? personHref(item.userId) : null);
  const screenshot =
    kind === 'bug' || kind === 'idea' ? screenshotOf(item) : undefined;
  const reply = showsReply(item);
  const footnote = done
    ? COPY.reopenFootnote
    : kind === 'errorReport'
      ? COPY.errorFootnote
      : null;

  // 40px / 13.5 on the desktop boards, 44px / 14 on the phone (ruling).
  const size: CSSProperties = isPhone
    ? { height: 44, fontSize: 14 }
    : { height: 40, fontSize: 13.5 };
  const iconSize = 14;

  const github = (
    <SafeExternalLink
      href={githubHref(item)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 12px',
        borderRadius: 9,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        textDecoration: 'none',
        ...adminButtonVariantStyle('outline'),
        ...size,
      }}
    >
      <ExternalLink size={iconSize} strokeWidth={1.8} aria-hidden />
      {COPY.github}
    </SafeExternalLink>
  );

  const buttons = (
    <div style={{ display: 'flex', gap: 8 }}>
      {done ? (
        <AdminButton
          variant="outline"
          disabled={busy}
          onClick={onReopen}
          style={{ ...size, flex: 1 }}
        >
          <RefreshCw size={iconSize} strokeWidth={1.8} aria-hidden />
          {COPY.reopen}
        </AdminButton>
      ) : (
        <AdminButton
          variant="gradient"
          disabled={busy}
          onClick={onMarkDone}
          style={{ ...size, flex: 1 }}
        >
          <Check size={iconSize} strokeWidth={1.8} aria-hidden />
          {COPY.markDone}
        </AdminButton>
      )}
      {reply && (
        // `10/venue-blocked-before-3c`: drawn at .45, its line beneath.
        <AdminButton
          variant="outline"
          disabled
          aria-describedby={replyLineId}
          style={{ ...size, opacity: 0.45, cursor: 'default' }}
        >
          <Reply size={iconSize} strokeWidth={1.8} aria-hidden />
          {isPhone ? COPY.replyPhone : COPY.reply}
        </AdminButton>
      )}
      {github}
    </div>
  );

  const replyLine = reply && (
    <p
      id={replyLineId}
      // 6px under the button, as `10/venue-blocked-before-3c` draws it.
      style={{
        margin: isPhone ? '-2px 0 0' : '-8px 0 0',
        fontSize: 12.5,
        color: 'var(--fg-muted)',
      }}
    >
      {COPY.replyLine}
    </p>
  );

  const toast = failure && (
    <SaveFailedToast
      title={failure.title}
      saved={failure.saved}
      onRetry={failure.retry}
      retrying={busy}
      onDismiss={onDismissFailure}
    />
  );

  const eyebrow = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <KindLabel kind={kind} />
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {whenLine(item.createdAt)}
      </span>
    </span>
  );

  const body = (
    <div
      data-testid="feedback-item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isPhone ? 12 : 14,
      }}
    >
      {done && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge kind="success" dot size="tile">
            {ADMIN_COPY.feedback.row.done}
          </StatusBadge>
          <span
            data-testid="feedback-item-done-line"
            style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}
          >
            {doneLine(item)}
          </span>
        </div>
      )}
      {quote && (
        <p
          data-testid="feedback-item-quote"
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--fg)',
            whiteSpace: 'pre-line',
            overflowWrap: 'anywhere',
          }}
        >
          {COPY.quote(quote)}
        </p>
      )}
      {screenshot && <Screenshot src={screenshot} phone={isPhone} />}
      <div>
        {fields.map((field) => (
          <FieldLine key={field.key} field={field} />
        ))}
      </div>
      <NoteField
        // Keyed by item only: a save landing mid-typing never resets the field.
        key={item.id}
        initial={item.adminNotes ?? ''}
        onSave={onNotes}
      />
      {!isPhone && toast}
    </div>
  );

  if (isPhone)
    return (
      <PhoneItemPage
        eyebrow={eyebrow}
        title={title}
        back={ADMIN_COPY.feedback.title}
        titleSize={20}
        gap={12}
        busy={busy}
        onClose={onClose}
      >
        {body}
        <PhoneFooter>
          {toast}
          {buttons}
          {replyLine}
        </PhoneFooter>
      </PhoneItemPage>
    );

  return (
    <SidePanel
      eyebrow={eyebrow}
      title={title}
      onClose={onClose}
      dismissible={!busy}
      footer={
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            // The footnote sits a panel gap under the actions.
            gap: 14,
          }}
        >
          {buttons}
          {replyLine}
          {footnote && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-subtle)' }}>
              {footnote}
            </p>
          )}
        </div>
      }
    >
      {body}
    </SidePanel>
  );
};
