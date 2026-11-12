// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { AdminInviteCode } from '@concert-crawl/types';
import { CodeTakenError } from './codes-api';
import { EditCodePanel } from './EditCodePanel';
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
      screen.getByText('REDROCKS is already a code. Try REDROCKS2.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('4 to 20 letters and numbers. Not case-sensitive.'),
    ).toBeInTheDocument();
  });
});
