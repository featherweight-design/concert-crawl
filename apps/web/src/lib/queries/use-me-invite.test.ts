import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => null,
    isSignedIn: false,
    userId: null,
  }),
}));

import {
  asAvatarColor,
  meInviteQueryKey,
  parseMeInvite,
} from './use-me-invite';

const valid = {
  code: 'BETA-7KQ2-M9XD',
  revoked: false,
  joined: {
    count: 6,
    faces: [
      { handle: 'maya', avatarColor: 'accent', avatarSecondColor: 'warning' },
      { handle: null, avatarColor: null, avatarSecondColor: null },
    ],
  },
};

describe('parseMeInvite', () => {
  it('reads the contract', () => {
    expect(parseMeInvite(valid)).toEqual(valid);
  });

  it('drops a colour the avatar cannot draw rather than trusting it', () => {
    const parsed = parseMeInvite({
      ...valid,
      joined: {
        count: 1,
        faces: [
          {
            handle: 'x',
            avatarColor: 'chartreuse',
            avatarSecondColor: 'signal',
          },
        ],
      },
    });
    expect(parsed?.joined.faces[0]).toEqual({
      handle: 'x',
      avatarColor: null,
      avatarSecondColor: 'signal',
    });
  });

  it.each([
    ['not an object', 'nope'],
    ['an empty code', { ...valid, code: '' }],
    ['no revoked flag', { ...valid, revoked: undefined }],
    ['a negative count', { ...valid, joined: { count: -1, faces: [] } }],
    ['a fractional count', { ...valid, joined: { count: 1.5, faces: [] } }],
    [
      'faces that are not a list',
      { ...valid, joined: { count: 1, faces: {} } },
    ],
    [
      'a face with a numeric handle',
      { ...valid, joined: { count: 1, faces: [{ handle: 7 }] } },
    ],
  ])('rejects %s', (_label, body) => {
    expect(parseMeInvite(body)).toBeNull();
  });
});

describe('asAvatarColor', () => {
  it('passes the palette and nothing else', () => {
    expect(asAvatarColor('signal')).toBe('signal');
    expect(asAvatarColor('pink')).toBeNull();
    expect(asAvatarColor(null)).toBeNull();
  });
});

describe('meInviteQueryKey', () => {
  it('is scoped to the account', () => {
    expect(meInviteQueryKey('user_1')).not.toEqual(meInviteQueryKey('user_2'));
  });
});
