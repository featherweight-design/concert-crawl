/**
 * The person page's calls (`/v1/admin/people/:userId`), from the browser with
 * the Clerk token, through the invite-codes admin's `call`. Payloads are
 * checked with type guards, so a shape drift fails into Couldn't load.
 */
import {
  isRole,
  type PersonDetail,
  type PersonJoinSource,
  type PersonRecent,
  type Role,
} from '@concert-crawl/types';
import {
  call,
  isCount,
  isRecord,
  isText,
  isTextOrNull,
  type GetToken,
} from '../invite-codes/codes-api';

/** The roles the segment can set; `sub_admin` is never set here. */
export type SettableRole = Exclude<Role, 'sub_admin'>;

const JOIN_KINDS = ['code', 'poster', 'member', 'founder', 'test'] as const;

const isJoinKind = (value: unknown): value is PersonJoinSource['kind'] =>
  JOIN_KINDS.some((kind) => kind === value);

/**
 * The join source, or null. A kind this build doesn't know (the API may add
 * one) reads as no source: the head shows the date alone and the Invite code
 * row is left out, rather than the page failing into Couldn't load.
 */
const joinSourceFrom = (value: unknown): PersonJoinSource | null =>
  isRecord(value) &&
  isJoinKind(value['kind']) &&
  isTextOrNull(value['code']) &&
  isTextOrNull(value['label'])
    ? { kind: value['kind'], code: value['code'], label: value['label'] }
    : null;

const isRecent = (value: unknown): value is PersonRecent => {
  if (!isRecord(value) || !isText(value['at'])) return false;
  switch (value['kind']) {
    case 'price':
      return (
        isText(value['priceMin']) &&
        isTextOrNull(value['priceMax']) &&
        isText(value['artist']) &&
        isText(value['venueName'])
      );
    case 'feedback':
      return isText(value['message']);
    case 'report':
      return (
        (value['about'] === 'artist' || value['about'] === 'event') &&
        isText(value['reason']) &&
        isText(value['subject'])
      );
    default:
      return false;
  }
};

const isStats = (value: unknown): value is PersonDetail['stats'] =>
  isRecord(value) &&
  isCount(value['watching']) &&
  isCount(value['concerts']) &&
  isCount(value['submittedPrices']) &&
  isCount(value['feedback']);

/** Everything but the join source and Recent, which are read leniently. */
type DetailRow = Omit<PersonDetail, 'joinSource' | 'recent'> & {
  joinSource?: unknown;
  recent: unknown[];
};

const isDetailRow = (value: unknown): value is DetailRow =>
  isRecord(value) &&
  isText(value['id']) &&
  isTextOrNull(value['handle']) &&
  isRole(value['role']) &&
  isTextOrNull(value['createdAt']) &&
  isTextOrNull(value['lastActiveAt']) &&
  typeof value['isTestAccount'] === 'boolean' &&
  typeof value['founder'] === 'boolean' &&
  isText(value['emailMasked']) &&
  Array.isArray(value['signInMethods']) &&
  value['signInMethods'].every(isText) &&
  (value['codeRedeemerCount'] === null ||
    isCount(value['codeRedeemerCount'])) &&
  isStats(value['stats']) &&
  Array.isArray(value['recent']);

export const personApi = (getToken: GetToken) => {
  const base = (userId: string) =>
    `/v1/admin/people/${encodeURIComponent(userId)}`;
  return {
    get: async (userId: string): Promise<PersonDetail> => {
      const data = await call(getToken, base(userId));
      if (!isDetailRow(data)) throw new Error('person');
      return {
        ...data,
        joinSource: joinSourceFrom(data.joinSource),
        // A Recent kind this build doesn't know is skipped, not fatal.
        recent: data.recent.filter(isRecent),
      };
    },
    /** The full email, audited as `user.email_shown`; '' when there is none. */
    showEmail: async (userId: string): Promise<string> => {
      const data = await call(getToken, `${base(userId)}/show-email`, {
        method: 'POST',
      });
      if (!isRecord(data) || !isText(data['email'])) throw new Error('email');
      return data['email'];
    },
    signOutEverywhere: async (userId: string): Promise<void> => {
      await call(getToken, `${base(userId)}/sign-out-everywhere`, {
        method: 'POST',
      });
    },
    /** The previous role comes back, so Undo can send it. */
    setRole: async (
      userId: string,
      role: SettableRole,
    ): Promise<{ role: Role; previousRole: Role }> => {
      const data = await call(getToken, `${base(userId)}/role`, {
        method: 'PATCH',
        body: { role },
      });
      if (
        !isRecord(data) ||
        !isRole(data['role']) ||
        !isRole(data['previousRole'])
      )
        throw new Error('role');
      return { role: data['role'], previousRole: data['previousRole'] };
    },
    setTestAccount: async (userId: string, isTest: boolean): Promise<void> => {
      await call(getToken, `${base(userId)}/test-account`, {
        method: 'POST',
        body: { isTest },
      });
    },
  };
};

export type PersonApi = ReturnType<typeof personApi>;
