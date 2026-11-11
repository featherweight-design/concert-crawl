import { describe, expect, it } from 'vitest';
import { hasClerkSession, sessionOwner } from './report';

const jwt = (payload: object) =>
  `e30.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.sig`;

describe('session detection', () => {
  it('reads a non-zero __client_uat, suffixed or not, as signed in', () => {
    expect(hasClerkSession('__client_uat=1731300000')).toBe(true);
    expect(hasClerkSession('a=1; __client_uat_x1=1731300000')).toBe(true);
    expect(hasClerkSession('__client_uat=0')).toBe(false);
    expect(hasClerkSession('')).toBe(false);
  });

  it('owns a report by the Clerk user id when the session cookie has one', () => {
    expect(
      sessionOwner(
        `__client_uat=1731300000; __session=${jwt({ sub: 'user_123' })}`,
      ),
    ).toBe('user:user_123');
  });

  it('falls back to the sign-in time, and is null when signed out', () => {
    expect(sessionOwner('__client_uat=1731300000; __session=garbage')).toBe(
      'uat:1731300000',
    );
    expect(sessionOwner(`__client_uat=0; __session=${jwt({ sub: 'u' })}`)).toBe(
      null,
    );
  });
});
