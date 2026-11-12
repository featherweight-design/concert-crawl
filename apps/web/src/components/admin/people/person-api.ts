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

const JOIN_KINDS: ReadonlySet<unknown> = new Set([
  'code',
  'poster',
  'founder',
  'test',
]);

const isJoinSource = (value: unknown): value is PersonJoinSource | null =>
  value === null ||
  (isRecord(value) &&
    JOIN_KINDS.has(value['kind']) &&
    isTextOrNull(value['code']) &&
    isTextOrNull(value['label']));

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

const isPersonDetail = (value: unknown): value is PersonDetail =>
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
  isJoinSource(value['joinSource']) &&
  (value['codeRedeemerCount'] === null ||
    isCount(value['codeRedeemerCount'])) &&
  isStats(value['stats']) &&
  Array.isArray(value['recent']) &&
  value['recent'].every(isRecent);

export const personApi = (getToken: GetToken) => {
  const base = (userId: string) =>
    `/v1/admin/people/${encodeURIComponent(userId)}`;
  return {
    get: async (userId: string): Promise<PersonDetail> => {
      const data = await call(getToken, base(userId));
      if (!isPersonDetail(data)) throw new Error('person');
      return data;
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
