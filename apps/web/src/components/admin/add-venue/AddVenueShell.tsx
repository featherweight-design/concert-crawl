'use client';

/**
 * The Add a venue step shell (`05/basics-desktop`, `05/step-1-basics-mobile`).
 * Desktop: the 250px step rail, the step's pane, and a 68px footer with Back,
 * "Saved as you go" and Continue. Phone: a full-screen page with Cancel or
 * Back, "Step N of 5", a 3px progress bar and a pinned Continue.
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Check, ChevronLeft, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useDialogKeyboard } from '@/components/admin/primitives/useDialogKeyboard';
import {
  CONTENT_GUTTER_X,
  CONTENT_GUTTER_Y,
} from '@/components/admin/shell/content-pane';
import {
  ADD_VENUE_STEPS,
  OPEN_STEPS,
  OPTIONAL_STEPS,
  stepNumber,
  type AddVenueStep,
} from './add-venue-rules';

const COPY = ADMIN_COPY.addVenue;

/** The drawn call to action: the gradient fill, dark text (`basics-desktop`). */
const continueStyle = (
  phone: boolean,
  busy: boolean,
  disabled: boolean,
): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: phone ? 46 : 38,
  padding: phone ? '0 12px' : '0 18px',
  borderRadius: 9,
  border: '1px solid transparent',
  background:
    'linear-gradient(135deg, var(--signal), var(--cta-end, var(--accent)))',
  color: 'var(--fg-on-accent)',
  fontFamily: 'inherit',
  fontSize: phone ? 15 : 13.5,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  cursor: disabled ? 'not-allowed' : busy ? 'progress' : 'pointer',
  opacity: disabled ? 0.5 : busy ? 0.7 : 1,
  flex: phone ? 1 : 'none',
});

interface ShellProps {
  phone: boolean;
  step: AddVenueStep;
  /** Steps saved at least once: the rail draws them done. */
  done: ReadonlySet<AddVenueStep>;
  /** The rail's header: the venue's name as typed. */
  name: string;
  busy: boolean;
  /** Back on desktop; Cancel (step 1) or Back on phone. */
  onBack: () => void;
  onContinue: () => void;
  /** Source's Continue has no step to open yet (3e-2a); it draws as the board does, off. */
  continueDisabled?: boolean;
  children: ReactNode;
}

/**
 * A rail row's two marks, kept apart: the current step keeps its highlight
 * and bold name, and a saved step's dot turns to the check even while it is
 * still the current one (Basics after its first Continue, while Source shows).
 */
interface RailState {
  current: boolean;
  done: boolean;
}

const railStateOf = (
  item: AddVenueStep,
  step: AddVenueStep,
  done: ReadonlySet<AddVenueStep>,
): RailState => ({ current: item === step, done: done.has(item) });

/** One rail row: a numbered 22px dot, the step's name, "Optional" under some. */
const RailStep = ({
  item,
  state,
}: {
  item: AddVenueStep;
  state: RailState;
}) => {
  const { current, done: isDone } = state;
  // A step outside OPEN_STEPS draws as the board's future steps and takes no
  // press (plan decision 12).
  const unreachable = !OPEN_STEPS.has(item);
  return (
    <li
      data-testid={`add-venue-step-${item}`}
      data-state={current ? 'current' : isDone ? 'done' : 'future'}
      data-done={isDone ? 'true' : undefined}
      aria-current={current ? 'step' : undefined}
      aria-disabled={unreachable && !current ? true : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        background: current ? 'var(--surface-2)' : 'transparent',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDone
            ? 'var(--success)'
            : current
              ? 'var(--signal)'
              : 'var(--border)',
          color: current || isDone ? 'var(--bg)' : 'var(--fg-muted)',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {isDone ? <Check size={12} strokeWidth={2.4} /> : stepNumber(item)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: current ? 700 : 600,
            color: current ? 'var(--fg)' : 'var(--fg-muted)',
          }}
        >
          {COPY.steps[item]}
          {isDone && <span className="sr-only">{` (${COPY.rail.done})`}</span>}
          {unreachable && !current && (
            <span className="sr-only">{` (${COPY.rail.notYet})`}</span>
          )}
        </div>
        {OPTIONAL_STEPS.has(item) && (
          <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
            {COPY.steps.optional}
          </span>
        )}
      </div>
    </li>
  );
};

const DesktopShell = ({
  step,
  done,
  name,
  busy,
  onBack,
  onContinue,
  continueDisabled = false,
  children,
}: ShellProps) => (
  <div
    data-testid="add-venue-shell"
    style={{
      // The board draws the rail and footer edge to edge under the topbar,
      // so the shell takes back the content pane's gutters.
      margin: `-${CONTENT_GUTTER_Y}px -${CONTENT_GUTTER_X}px`,
      height: `calc(100% + ${CONTENT_GUTTER_Y * 2}px)`,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}
  >
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <nav
        aria-label={COPY.title}
        style={{
          width: 250,
          flex: 'none',
          borderRight: '1px solid var(--border)',
          padding: '24px 16px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '0 12px 14px' }}>
          <div
            data-testid="add-venue-rail-name"
            style={{
              fontSize: 15,
              fontWeight: 800,
              overflowWrap: 'anywhere',
            }}
          >
            {name.trim() || COPY.rail.unnamed}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {COPY.rail.status}
          </div>
        </div>
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {ADD_VENUE_STEPS.map((item) => (
            <RailStep
              key={item}
              item={item}
              state={railStateOf(item, step, done)}
            />
          ))}
        </ol>
      </nav>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {children}
      </div>
    </div>
    <div
      style={{
        height: 68,
        flex: 'none',
        borderTop: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 28px',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        data-testid="add-venue-back"
        style={{
          height: 38,
          padding: '0 12px',
          borderRadius: 9,
          border: '1px solid transparent',
          background: 'transparent',
          color: 'var(--fg-muted)',
          fontFamily: 'inherit',
          fontSize: 13.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {COPY.footer.back}
      </button>
      <span style={{ flex: 1 }} />
      <span
        style={{ fontSize: 12.5, color: 'var(--fg-subtle)', marginRight: 6 }}
      >
        {COPY.footer.savedAsYouGo}
      </span>
      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled}
        aria-busy={busy}
        data-testid="add-venue-continue"
        style={continueStyle(false, busy, continueDisabled)}
      >
        {busy ? COPY.footer.saving : COPY.footer.continue}
      </button>
    </div>
  </div>
);

const PhoneShell = ({
  step,
  busy,
  onBack,
  onContinue,
  continueDisabled = false,
  children,
}: ShellProps) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const number = stepNumber(step);
  const first = number === 1;
  useDialogKeyboard(pageRef, onBack, { dismissible: !busy });
  useEffect(() => {
    pageRef.current?.focus();
  }, []);
  return (
    <div
      ref={pageRef}
      role="dialog"
      aria-modal="true"
      aria-label={COPY.title}
      data-testid="add-venue-shell"
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
          padding: '14px 16px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--fg-muted)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          data-testid="add-venue-back"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 0',
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {first ? (
            <X size={15} strokeWidth={1.8} aria-hidden />
          ) : (
            <ChevronLeft size={16} aria-hidden />
          )}
          {first ? COPY.footer.cancel : COPY.footer.back}
        </button>
        <span style={{ flex: 1 }} />
        <span data-testid="add-venue-step-of">
          {COPY.stepOf(number, ADD_VENUE_STEPS.length)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={COPY.stepOf(number, ADD_VENUE_STEPS.length)}
        aria-valuemin={0}
        aria-valuemax={ADD_VENUE_STEPS.length}
        aria-valuenow={number}
        style={{
          height: 3,
          margin: '6px 16px 0',
          borderRadius: 2,
          background: 'var(--border)',
        }}
      >
        <div
          style={{
            width: `${(number / ADD_VENUE_STEPS.length) * 100}%`,
            height: '100%',
            borderRadius: 2,
            background:
              'linear-gradient(90deg, var(--signal), var(--cta-end, var(--accent)))',
          }}
        />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '18px 16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {children}
      </div>
      <div
        style={{
          flex: 'none',
          padding: '12px 16px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          aria-busy={busy}
          data-testid="add-venue-continue"
          style={continueStyle(true, busy, continueDisabled)}
        >
          {busy ? COPY.footer.saving : COPY.footer.continue}
        </button>
      </div>
    </div>
  );
};

export const AddVenueShell = (props: ShellProps) =>
  props.phone ? <PhoneShell {...props} /> : <DesktopShell {...props} />;
