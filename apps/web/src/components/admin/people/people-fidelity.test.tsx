// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { StatusBadge } from '@/components/admin/primitives';
import { AdminButton } from '@/components/admin/primitives/AdminButton';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { InviteCodesRowsSkeleton } from '../invite-codes/InviteCodesSkeleton';
import { PeopleClient } from './PeopleClient';
import { PersonClient } from './PersonClient';
import { Account, Toast, type AccountProps } from './PersonParts';
import { PeopleSkeleton } from './PeopleSkeleton';
import { PersonSkeleton } from './PersonSkeleton';
import { roleCaption } from './person-rules';
import { RoleChip, roleChipTone } from './RoleChip';

// P47-13 PR A: People and the person page against the 07 boards.

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token', userId: 'user_viewer' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  notFound: () => {
    throw new Error('notFound');
  },
}));

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const personRow = (over: Record<string, unknown>) => ({
  id: 'user_1',
  handle: 'sam_on_colfax',
  avatarColor: null,
  avatarSecondColor: null,
  emailMasked: 's•••@gmail.com',
  role: 'user',
  createdAt: '2026-10-02T18:00:00Z',
  lastActiveAt: '2026-11-14T10:00:00Z',
  watching: 0,
  isTestAccount: false,
  joinSource: null,
  ...over,
});

const detail = (over: Record<string, unknown> = {}) => ({
  ...personRow({ handle: 'mira.k', role: 'beta' }),
  founder: false,
  signInMethods: ['Google'],
  codeRedeemerCount: null,
  stats: { watching: 3, concerts: 1, submittedPrices: 4, feedback: 0 },
  recent: [],
  ...over,
});

let peopleBody: unknown = null;
let personBody: unknown = null;

const setPhone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => {
  setPhone(false);
  peopleBody = {
    people: [personRow({})],
    total: 1,
    counts: { user: 1 },
    truncated: false,
  };
  personBody = detail();
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/v1/admin/people/'))
        return Promise.resolve(json({ success: true, data: personBody }));
      if (url.includes('/v1/admin/people'))
        return peopleBody === 'pending'
          ? new Promise(() => {})
          : Promise.resolve(json({ success: true, data: peopleBody }));
      return Promise.resolve(json({ success: true, data: [] }));
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SH37 + SH50: the role chip (07/people, 07/person)', () => {
  it('draws Member in the board neutral: fg-subtle tint and dot, fg-muted text', () => {
    expect(roleChipTone('neutral')).toEqual({
      tint: 'var(--fg-subtle)',
      text: 'var(--fg-muted)',
    });
    render(<RoleChip role="user">Member</RoleChip>);
    const chip = screen.getByTestId('role-chip');
    expect(chip.style.color).toBe('var(--fg-muted)');
    expect(chip.style.background).toContain('var(--fg-subtle) 14%');
    expect(chip.querySelector('span')?.style.background).toBe(
      'var(--fg-subtle)',
    );
  });

  it('is 22 tall, 9px sides, 11.5px text, with a flat 6px dot', () => {
    render(<RoleChip role="beta">Beta</RoleChip>);
    const chip = screen.getByTestId('role-chip');
    expect(chip.style.height).toBe('22px');
    expect(chip.style.padding).toBe('0px 9px');
    expect(chip.style.fontSize).toBe('11.5px');
    expect(chip.style.color).toBe('var(--signal)');
    const dot = chip.querySelector('span');
    expect(dot?.style.width).toBe('6px');
    expect(dot?.style.boxShadow).toBe('');
  });

  it('tints Admin accent', () => {
    expect(roleChipTone('accent').tint).toBe('var(--accent)');
  });

  it("leaves StatusBadge's neutral as it was", () => {
    render(<StatusBadge kind="neutral">Other</StatusBadge>);
    expect(screen.getByText('Other').style.background).toBe('var(--surface-2)');
  });
});

describe('People list (07/people, 07/people-mobile)', () => {
  it('SH50: WATCHING shows 0 for zero, not a blank', async () => {
    render(<PeopleClient code={null} />);
    const cell = await screen.findByTestId('person-watching');
    expect(cell).toHaveTextContent(/^0$/);
  });

  it('SH37: the list draws the Member chip from RoleChip', async () => {
    render(<PeopleClient code={null} />);
    const chip = await screen.findByTestId('role-chip');
    expect(chip).toHaveTextContent(ADMIN_COPY.peoplePage.roles.user);
    expect(chip.style.height).toBe('22px');
  });

  it('SH50: the phone row puts 10 between avatar and handle, 12 to the chip', async () => {
    setPhone(true);
    render(<PeopleClient code={null} />);
    const identity = await screen.findByTestId('person-row-identity');
    expect(identity.style.gap).toBe('10px');
    expect(identity.parentElement?.style.gap).toBe('12px');
  });

  it('SH38: no results shows the people icon', async () => {
    peopleBody = { people: [], total: 0, counts: {}, truncated: false };
    render(<PeopleClient code={null} />);
    const empty = await screen.findByTestId('empty-state');
    expect(empty.querySelector('svg.lucide-users')).not.toBeNull();
    expect(empty.querySelector('svg.lucide-search')).toBeNull();
  });

  it('SH50: the phone loads with the mobile list skeleton', () => {
    setPhone(true);
    peopleBody = 'pending';
    render(<PeopleClient code={null} />);
    return screen.findByTestId('people-phone-skeleton').then((skeleton) => {
      expect(
        within(skeleton).getAllByTestId('people-phone-skeleton-row'),
      ).toHaveLength(7);
    });
  });
});

describe('Skeletons (07/loading-people, 07/loading-person, 07/loading-any-list-on-mobile)', () => {
  it('draws the row card on surface-1, as both loading boards do', () => {
    render(<InviteCodesRowsSkeleton avatar />);
    expect(screen.getByTestId('page-skeleton').style.background).toBe(
      'var(--surface-1)',
    );
  });

  it('swaps in the phone rows below the breakpoint', () => {
    render(<PeopleSkeleton />);
    const phone = screen.getByTestId('people-phone-skeleton');
    expect(phone.closest('.min-\\[721px\\]\\:hidden')).not.toBeNull();
    const desktop = screen.getByTestId('page-skeleton');
    expect(desktop.closest('.max-\\[720px\\]\\:hidden')).not.toBeNull();
  });

  it('phone rows: 44px r10 tile, fading 13% a row', () => {
    render(<PeopleSkeleton />);
    const rows = screen.getAllByTestId('people-phone-skeleton-row');
    expect(rows[0]?.style.gap).toBe('12px');
    expect(rows[1]?.style.opacity).toBe('0.87');
  });

  it('person skeleton keeps the board 78 and 180 card heights', () => {
    const { container } = render(<PersonSkeleton />);
    const heights = Array.from(
      container.querySelectorAll<HTMLElement>('div'),
    ).map((el) => el.style.height);
    expect(heights.filter((height) => height === '78px')).toHaveLength(4);
    expect(heights.filter((height) => height === '180px')).toHaveLength(2);
  });
});

describe('Person page (07/person, 07/person-mobile)', () => {
  it('SH50: the phone ⋯ is a bare 18px glyph, no border or fill', async () => {
    setPhone(true);
    render(<PersonClient userId="user_1" />);
    const trigger = await screen.findByTestId('person-menu');
    expect(trigger.style.background).toBe('transparent');
    expect(trigger.style.border).not.toContain('solid');
    expect(trigger.querySelector('svg')?.getAttribute('width')).toBe('18');
  });

  it('keeps the desktop ⋯ as the bordered 36px box', async () => {
    render(<PersonClient userId="user_1" />);
    const trigger = await screen.findByTestId('person-menu');
    expect(trigger.style.height).toBe('36px');
    expect(trigger.style.border).toContain('solid');
  });

  it('SH50: the phone draws no role caption under the segment', async () => {
    setPhone(true);
    render(<PersonClient userId="user_1" />);
    await screen.findByTestId('person-menu');
    expect(screen.queryByText(roleCaption('beta'))).toBeNull();
  });

  it('keeps the caption on desktop', async () => {
    render(<PersonClient userId="user_1" />);
    await screen.findByTestId('person-menu');
    expect(screen.getByText(roleCaption('beta'))).toBeInTheDocument();
  });

  it('SH37: the head chip is the RoleChip', async () => {
    render(<PersonClient userId="user_1" />);
    const chip = await screen.findByTestId('role-chip');
    expect(chip.style.height).toBe('22px');
  });
});

const accountProps = (over: Partial<AccountProps> = {}): AccountProps => ({
  emailMasked: 'm•••@gmail.com',
  shownEmail: null,
  emailBusy: false,
  emailError: false,
  onShowEmail: vi.fn(),
  signsInWith: 'Google',
  inviteCode: null,
  isTest: false,
  testBusy: false,
  testError: false,
  onTest: vi.fn(),
  ...over,
});

describe('SH50: the email note (07/email-revealed)', () => {
  it('sits under the Account card at 12.5px, not inside it', () => {
    render(
      <Account {...accountProps({ shownEmail: 'mira.kowalski@gmail.com' })} />,
    );
    const note = screen.getByTestId('email-shown-note');
    expect(note).toHaveTextContent(ADMIN_COPY.personPage.emailShownNote);
    expect(note.style.fontSize).toBe('12.5px');
    const card = screen.getByRole('region', {
      name: ADMIN_COPY.personPage.account,
    });
    expect(card.contains(note)).toBe(false);
    expect(note.parentElement?.style.gap).toBe('14px');
  });

  it('is not drawn while the email is hidden', () => {
    render(<Account {...accountProps()} />);
    expect(screen.queryByTestId('email-shown-note')).toBeNull();
  });
});

describe('SH50: the Undo toast (07/role-changed-with-undo)', () => {
  it('centres under the content column on desktop (left 232, right 0)', () => {
    render(<Toast title="@mira.k is now Member" body={null} />);
    const toast = screen.getByTestId('person-toast');
    expect(toast.style.left).toBe('232px');
    expect(toast.style.right).toBe('0px');
  });

  it('keeps 16px sides on the phone', () => {
    setPhone(true);
    render(<Toast title="@mira.k is now Member" body={null} />);
    const toast = screen.getByTestId('person-toast');
    expect(toast.style.left).toBe('16px');
    expect(toast.style.right).toBe('16px');
  });
});

describe('SH50: Make admin (07/make-an-admin-asks-first)', () => {
  it('ends the gradient on --cta-end (#de96df), not the raw accent', () => {
    render(
      <AdminButton type="button" variant="gradient">
        {ADMIN_COPY.personPage.makeAdmin.confirm}
      </AdminButton>,
    );
    const button = screen.getByRole('button', {
      name: ADMIN_COPY.personPage.makeAdmin.confirm,
    });
    expect(button.style.background).toContain('var(--cta-end');
  });
});
