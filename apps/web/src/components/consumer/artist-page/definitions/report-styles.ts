import { REPORT_TOKENS } from '@/components/consumer/reporting/reportTokens';

/** The wrong-artist sheets' amber, shared by the form and the sent stub. */
export const REPORT_AMBER = REPORT_TOKENS.postponed;

export const REPORT_MONO = {
  fontFamily: 'JetBrains Mono, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};
