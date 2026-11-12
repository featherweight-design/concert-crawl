// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { AdminInviteCode } from '@concert-crawl/types';
import { CodeTakenError, codesApi } from './codes-api';
import { CodePanel } from './CodePanel';
import { EditCodePanel } from './EditCodePanel';
import { SeatsBar } from './SeatsBar';
import { NewCodePanel } from './NewCodePanel';

const NOW = new Date('2026-11-12T12:00:00Z');

const code = (over: Partial<AdminInviteCode> = {}): AdminInviteCode => ({
  id: '00000000-0000-4000-8000-000000000001',
  code: 'REDROCKS',
  createdBy: 'user_1',
  usedBy: 'user_2',
  usedAt: '2026-10-02T18:00:00Z',
  expiresAt: null,
  revokedAt: null,
  revokedBy: null,
  createdAt: '2026-10-01T18:00:00Z',
  maxUses: 50,
  useCount: 23,
  label: 'Red Rocks lot, Oct',
  createdByHandle: 'jules',
  lastUsedAt: '2026-11-09T18:00:00Z',
  kind: 'admin',
  ...over,
});

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

// A member's own share code, as GET /v1/admin/invite-codes returns it.
const memberCode = (over: Partial<AdminInviteCode> = {}) =>
  code({
    code: 'BETA-7F3A-91C2',
    label: null,
    maxUses: 10_000,
    useCount: 4,
    createdByHandle: 'mira',
    kind: 'member',
    ...over,
  });

const panelApi = () => ({
  ...codesApi(async () => null),
  redemptions: vi.fn(async () => ({ data: [], total: 4 })),
});

const renderPanel = (
  panelCode: AdminInviteCode,
  status: 'active' | 'full' | 'revoked',
) =>
  render(
    <CodePanel
      code={panelCode}
      status={status}
      api={panelApi()}
      onCopy={vi.fn()}
      onAddSeats={vi.fn()}
      onRevoke={vi.fn()}
      onReactivate={vi.fn()}
      onClose={vi.fn()}
    />,
  );

describe('CodePanel on a member share code', () => {
  it('keeps Revoke and hides Add seats', async () => {
    renderPanel(memberCode(), 'active');
    expect(
      await screen.findByRole('button', { name: 'Revoke…' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add seats' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Who joined with it · 4')).toBeInTheDocument();
  });

  it('offers no Reactivate once revoked', async () => {
    renderPanel(memberCode({ revokedAt: '2026-11-10T18:00:00Z' }), 'revoked');
    await screen.findByText('Who joined with it · 4');
    expect(
      screen.queryByRole('button', { name: 'Reactivate…' }),
    ).not.toBeInTheDocument();
  });

  it('reads "Personal · @handle" and "N joined", never the 10,000 cap', async () => {
    renderPanel(memberCode(), 'active');
    await screen.findByText('Who joined with it · 4');
    expect(screen.getByText('Personal · @mira')).toBeInTheDocument();
    expect(screen.getByText('4 joined')).toBeInTheDocument();
    expect(screen.queryByText(/10000|10,000/)).not.toBeInTheDocument();
  });

  it('still offers an admin code Add seats, and Reactivate once ended', async () => {
    renderPanel(code(), 'active');
    expect(
      await screen.findByRole('button', { name: 'Add seats' }),
    ).toBeInTheDocument();
    cleanup();
    renderPanel(code({ revokedAt: '2026-11-10T18:00:00Z' }), 'revoked');
    expect(
      await screen.findByRole('button', { name: 'Reactivate…' }),
    ).toBeInTheDocument();
  });
});

describe('SeatsBar', () => {
  it('draws "23 of 50" with a cap', () => {
    render(<SeatsBar used={23} max={50} full={false} />);
    expect(screen.getByText('23 of 50')).toBeInTheDocument();
  });

  it('draws "N joined" alone with no cap', () => {
    render(<SeatsBar used={4} max={null} full={false} />);
    expect(screen.getByText('4 joined')).toBeInTheDocument();
    expect(screen.queryByText(/ of /)).not.toBeInTheDocument();
  });
});

describe('EditCodePanel', () => {
  it('refuses seats below the number used, inline', () => {
    const onSave = vi.fn();
    render(
      <EditCodePanel
        code={code()}
        now={NOW}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Other' }));
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '20' },
    });
    expect(screen.getByText('23 already used')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('offers Keep {date} first, selected, for a future exact expiry', () => {
    render(
      <EditCodePanel
        code={code({ expiresAt: '2027-02-01T19:00:00Z' })}
        now={NOW}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const expiry = screen
      .getAllByRole('radio')
      .filter((radio) => /Keep|Never|days/.test(radio.textContent ?? ''));
    expect(expiry[0]).toHaveTextContent('Keep Feb 1');
    expect(expiry[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('has no Keep when the code never expires', () => {
    render(
      <EditCodePanel
        code={code()}
        now={NOW}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(/^Keep /)).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Never' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

describe('NewCodePanel', () => {
  it('suggests the code from the label', () => {
    render(
      <NewCodePanel create={vi.fn()} onCreated={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Label (only you see it)'), {
      target: { value: 'Globe Hall' },
    });
    expect(screen.getByLabelText('Code')).toHaveValue('GLOBEHALL');
  });

  it('says a taken code is taken, with the suggestion and the rule', async () => {
    const create = vi.fn(async () => {
      throw new CodeTakenError('REDROCKS', 'REDROCKS2');
    });
    render(
      <NewCodePanel create={create} onCreated={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'redrocks' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Make code' }));
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'REDROCKS' }),
    );
    expect(
      await screen.findByText('REDROCKS is already a code. Try REDROCKS2.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('4 to 20 letters and numbers. Not case-sensitive.'),
    ).toBeInTheDocument();
  });

  it('stores the label without a typed "Poster ·" prefix', async () => {
    const create = vi.fn(async () => code());
    render(
      <NewCodePanel create={create} onCreated={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Label (only you see it)'), {
      target: { value: 'Poster · Globe Hall' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Make code' }));
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Globe Hall', code: 'GLOBEHALL' }),
    );
  });

  it('refuses a code starting with BETA before sending it', () => {
    const create = vi.fn();
    render(
      <NewCodePanel create={create} onCreated={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'betatest' },
    });
    expect(
      screen.getByText("Codes can't start with BETA."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make code' })).toBeDisabled();
  });
});

describe('EditCodePanel saving', () => {
  it('sends only what changed, and closes without saving when nothing did', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <EditCodePanel
        code={code()}
        now={NOW}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: '100' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ maxUses: 100 });
  });

  it('focuses the checked Seats pill when opened from Add seats', async () => {
    render(
      <EditCodePanel
        code={code()}
        now={NOW}
        focusSeats
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: '50' })).toHaveFocus(),
    );
  });
});
