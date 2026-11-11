import { CREW_GRADIENT } from './lib/styles';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY.howItWorks;

/**
 * Three steps under a lone crew (B+): what a crew is for, said once, while
 * there is still room on the page to say it. The list drops it as soon as a
 * second crew makes the point on its own.
 */
export const HowCrewsWork = ({ wide }: { wide: boolean }) => (
  <section aria-labelledby="how-crews-work" className="flex flex-col gap-3">
    <h2
      id="how-crews-work"
      style={{
        margin: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.18em',
        color: 'var(--fg-subtle)',
      }}
    >
      {COPY.eyebrow}
    </h2>
    <ol
      className="m-0 grid list-none gap-2.5 p-0"
      style={{
        gridTemplateColumns: wide
          ? 'repeat(3, minmax(0,1fr))'
          : 'minmax(0,1fr)',
      }}
    >
      {COPY.steps.map((step, index) => (
        <li
          key={step.title}
          className="flex flex-col"
          style={{
            gap: 4,
            padding: wide ? '14px 15px 16px' : '16px 16px 18px',
            borderRadius: 14,
            border: '1px dashed var(--border-strong)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: wide ? 20 : 22,
              fontWeight: 900,
              lineHeight: 1.1,
              width: 'fit-content',
              background: CREW_GRADIENT,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {index + 1}
          </span>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: wide ? 15 : 16,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {step.title}
          </h3>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              lineHeight: 1.45,
              color: 'var(--fg-muted)',
            }}
          >
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  </section>
);
