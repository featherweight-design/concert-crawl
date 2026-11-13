import type { NeedsYouAnswer, QueueRow } from '../needs-you-api';

/** What every kind's drawn panel body takes. */
export interface PanelProps {
  row: QueueRow;
  /** Mountain Time's today, `YYYY-MM-DD`. */
  today: string;
  /** True when this item is first in the queue's own order. */
  ranksFirst: boolean;
  busy: boolean;
  /** The card's own answer handler (confirm-before-notify, navigation). */
  onAnswer: (answer: NeedsYouAnswer) => void;
}
