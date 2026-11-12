import { describe, expect, it } from 'vitest';
import type { PersonDetail, PersonJoinSource } from '@concert-crawl/types';
import { headLine, inviteCodeLabel } from './person-rules';

const NOW = new Date('2026-11-12T17:00:00Z');

const person = (joinSource: PersonJoinSource | null): PersonDetail => ({
  id: 'p1',
  handle: 'sam',
  role: 'user',
  createdAt: '2026-10-02T18:00:00Z',
  lastActiveAt: null,
  isTestAccount: false,
  founder: false,
  emailMasked: 's***@example.com',
  signInMethods: [],
  joinSource,
  codeRedeemerCount: 4,
  stats: { watching: 0, concerts: 0, submittedPrices: 0, feedback: 0 },
  recent: [],
});

describe('a member share code on the person page', () => {
  const code: PersonJoinSource = {
    kind: 'code',
    code: 'BETA-7F3A-91C2',
    label: null,
  };
  const member: PersonJoinSource = { ...code, kind: 'member' };

  it('reads the head line as a code does', () => {
    expect(headLine(person(member), NOW)).toBe(headLine(person(code), NOW));
    expect(headLine(person(member), NOW)).toBe(
      'Joined Oct 2 with code BETA-7F3A-91C2',
    );
  });

  it('shows the Invite code row as a code does', () => {
    expect(inviteCodeLabel(person(member), false)).toBe(
      'BETA-7F3A-91C2 · 1 of 4 who joined with it',
    );
    expect(inviteCodeLabel(person(member), true)).toBe('BETA-7F3A-91C2');
  });
});
