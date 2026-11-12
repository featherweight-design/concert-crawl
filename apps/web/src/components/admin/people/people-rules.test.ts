import { describe, expect, it, vi } from 'vitest';
import type { AdminPerson, PeopleApi, PeoplePage } from './people-api';
import {
  chipCount,
  fetchPeople,
  lastActiveLabel,
  personHref,
} from './people-rules';

const person = (id: string, isTestAccount = false): AdminPerson => ({
  id,
  handle: id,
  emailMasked: 'a***@example.com',
  role: 'user',
  createdAt: '2026-10-02T18:00:00Z',
  lastActiveAt: null,
  watching: 0,
  isTestAccount,
});

describe('lastActiveLabel', () => {
  // 2026-11-12 10:00 in Denver.
  const now = new Date('2026-11-12T17:00:00Z');
  it.each([
    ['2026-11-12T16:59:40Z', 'Now'],
    ['2026-11-12T16:46:00Z', '14m ago'],
    ['2026-11-12T15:00:00Z', '2h ago'],
    ['2026-11-11T09:00:00Z', 'Yesterday'],
    ['2026-11-09T17:00:00Z', '3d ago'],
  ])('%s reads %s', (iso, label) => {
    expect(lastActiveLabel(iso, now)).toBe(label);
  });

  it('says nothing for someone never active', () => {
    expect(lastActiveLabel(null, now)).toBeNull();
  });
});

describe('chipCount', () => {
  const counts = { total: 214, beta: 38, admin: 2, promoter: 0 };
  it('reads Everyone from the total and a role from its count', () => {
    expect(chipCount('everyone', counts)).toBe(214);
    expect(chipCount('beta', counts)).toBe(38);
    expect(chipCount('promoter', counts)).toBe(0);
  });
  it('has no count for Test accounts until the API sends one', () => {
    expect(chipCount('test', counts)).toBeNull();
    expect(chipCount('everyone', undefined)).toBeNull();
  });
});

describe('fetchPeople', () => {
  const page = (people: AdminPerson[], total: number): PeoplePage => ({
    people,
    total,
    counts: { total },
    truncated: false,
  });

  it('asks the API for a role, a code and an offset', async () => {
    const list = vi.fn().mockResolvedValue(page([], 0));
    const api: PeopleApi = { list };
    await fetchPeople(api, { search: 'mi', chip: 'beta', code: 'c1' }, 2);
    expect(list).toHaveBeenCalledWith({
      search: 'mi',
      role: 'beta',
      code: 'c1',
      limit: 100,
      offset: 100,
    });
  });

  it('sweeps every page for Test accounts and keeps only them', async () => {
    const first = Array.from({ length: 100 }, (_, i) => person(`p${i}`));
    const list = vi
      .fn()
      .mockResolvedValueOnce(
        page([...first.slice(0, 99), person('t1', true)], 102),
      )
      .mockResolvedValueOnce(page([person('p100'), person('t2', true)], 102));
    const result = await fetchPeople(
      { list },
      { search: '', chip: 'test', code: null },
      1,
    );
    expect(list).toHaveBeenCalledTimes(2);
    expect(result.people.map((each) => each.id)).toEqual(['t1', 't2']);
    expect(result.total).toBe(2);
  });
});

describe('personHref', () => {
  it('opens the person page under People', () => {
    expect(personHref('user_2abc')).toBe('/admin/people/user_2abc');
  });
});
