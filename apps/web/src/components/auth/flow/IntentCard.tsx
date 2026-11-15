import type { IntentSubject } from '@/lib/auth/intent-subject';
import { AUTH_FLOW_COPY } from './definitions/copy';

const COPY = AUTH_FLOW_COPY.intent;

interface IntentText {
  eyebrow?: string;
  title: string;
  sub?: string;
}

/**
 * What the card says for each subject. `null` for the generic subject: it has
 * no card, and the page keeps its own title (the board's "Sign in to keep
 * going" is only the page's own heading when nothing more is known).
 */
export function intentText(subject: IntentSubject): IntentText | null {
  switch (subject.kind) {
    case 'show':
      return {
        eyebrow: subject.eyebrow,
        title: COPY.watch(subject.title),
        sub: COPY.watchSub,
      };
    case 'artist':
      return {
        eyebrow:
          subject.dates > 0
            ? COPY.artistEyebrow(subject.dates)
            : COPY.artistEyebrowNone,
        title: COPY.follow(subject.name),
        sub: COPY.followSub,
      };
    case 'page':
      return {
        eyebrow: subject.page,
        title: COPY.page(subject.page),
        sub: COPY.pageSub,
      };
    case 'generic':
      return null;
  }
}

/**
 * The block that says what the visitor was about to do, above the form. On the
 * sign-in page it stands in for the page's title (an h1); on sign-up it sits
 * over the form's own title (an h2).
 */
export function IntentCard({
  subject,
  level,
}: {
  subject: IntentSubject;
  level: 1 | 2;
}) {
  const text = intentText(subject);
  if (!text) return null;
  const Title = level === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-col gap-2" data-intent={subject.kind}>
      {text.eyebrow ? (
        <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-signal uppercase">
          {text.eyebrow}
        </span>
      ) : null}
      <Title className="m-0 text-[28px] leading-[1.08] font-black tracking-[-0.03em] text-balance text-fg">
        {text.title}
      </Title>
      {text.sub ? (
        <p className="m-0 text-[14.5px] leading-[1.5] text-fg-muted">
          {text.sub}
        </p>
      ) : null}
    </div>
  );
}
