import { describe, expect, it } from 'vitest';
import type { CrewMemberPreview, CrewShow } from '@concert-crawl/types';

import {
  goingLine,
  isTonight,
  summariseGoing,
  tileParts,
  todayMt,
} from './coming-up';

const member = (userId: string, handle: string | null): CrewMemberPreview => ({
  userId,
  handle,
  avatarColor: null,
  avatarSecondColor: null,
});

const show = (
  going: CrewMemberPreview[],
  goingCount = going.length,
): CrewShow => ({
  eventId: 'e1',
  iso: '2026-03-06',
  showTime: '21:00:00',
  title: 'TOKiMONSTA',
  artist: 'TOKiMONSTA',
  imageUrl: null,
  artistPhotoUrl: null,
  venue: 'Mission Ballroom',
  venueSlug: 'mission-ballroom',
  goingCount,
  going,
});

const line = (crewShow: CrewShow, viewer: string | null) =>
  goingLine(
    crewShow.goingCount,
    summariseGoing(crewShow, viewer, 'YOU'),
    'GOING',
  );

describe('the going line (41/crew-coming-up)', () => {
  it('just you: "1 GOING · YOU", one face', () => {
    const crewShow = show([member('me', 'hugh')]);
    expect(line(crewShow, 'me')).toBe('1 GOING · YOU');
    expect(summariseGoing(crewShow, 'me', 'YOU').faces).toHaveLength(1);
  });

  it('you and others: you first, the next name, then +N, three faces', () => {
    const crewShow = show(
      [
        member('mira', 'mira'),
        member('me', 'hugh'),
        member('theo', 'theo'),
        member('jules', 'jules'),
      ],
      4,
    );
    expect(line(crewShow, 'me')).toBe('4 GOING · YOU, MIRA +2');
    const faces = summariseGoing(crewShow, 'me', 'YOU').faces;
    expect(faces).toHaveLength(3);
    expect(faces[0]?.userId).toBe('me');
  });

  it('others, not you: their names, and the viewer is not going', () => {
    const crewShow = show([member('mira', 'mira'), member('theo', 'theo')]);
    expect(line(crewShow, 'me')).toBe('2 GOING · MIRA, THEO');
    expect(summariseGoing(crewShow, 'me', 'YOU').youGoing).toBe(false);
  });

  it('never invents a name for a member with no handle', () => {
    const crewShow = show([member('a', null), member('b', '')]);
    expect(line(crewShow, 'me')).toBe('2 GOING');
    const named = show([member('a', null), member('mira', 'mira')]);
    expect(line(named, 'me')).toBe('2 GOING · MIRA +1');
  });

  it('counts more than it draws when the crew is bigger than the faces', () => {
    const crewShow = show([member('a', 'amy'), member('b', 'bo')], 7);
    expect(line(crewShow, 'me')).toBe('7 GOING · AMY, BO +5');
  });
});

describe('the date tile and tonight', () => {
  it('reads the weekday, day and month from the date, not a timezone', () => {
    expect(tileParts('2026-03-06')).toEqual({
      weekday: 'FRI',
      day: '6',
      month: 'MAR',
    });
  });

  it('is tonight only on today in Mountain Time', () => {
    const now = new Date('2026-03-07T05:30:00Z'); // 22:30 on the 6th in Denver
    expect(todayMt(now)).toBe('2026-03-06');
    expect(isTonight('2026-03-06', now)).toBe(true);
    expect(isTonight('2026-03-07', now)).toBe(false);
  });
});
