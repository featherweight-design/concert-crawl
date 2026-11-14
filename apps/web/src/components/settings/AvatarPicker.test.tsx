// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { AvatarPicker } from './AvatarPicker';
import { AVATAR_PAIRS } from './definitions/constants';

const COPY = CONSUMER_COPY.settings;

const pairLabel = (first: string, second: string) =>
  COPY.avatarPairSwatchAriaLabel(first, second);

afterEach(cleanup);

describe('AvatarPicker', () => {
  it('draws the six pairs in the board order, then four solids', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="signal"
        avatarSecondColor="accent"
        onChange={vi.fn()}
      />,
    );
    const labels = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    expect(labels).toEqual([
      ...AVATAR_PAIRS.map(([first, second]) => pairLabel(first, second)),
      ...['signal', 'accent', 'success', 'warning'].map((color) =>
        COPY.avatarColorSwatchAriaLabel(color),
      ),
    ]);
    expect(AVATAR_PAIRS).toHaveLength(6);
  });

  it('labels the two rows', () => {
    const { container } = render(
      <AvatarPicker
        handle="adal"
        avatarColor="signal"
        avatarSecondColor="accent"
        onChange={vi.fn()}
      />,
    );
    expect(container.textContent).toContain(COPY.avatarMixTwoEyebrow);
    expect(container.textContent).toContain(COPY.avatarSolidEyebrow);
  });

  it('marks the saved pair as the selected swatch, and no solid', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="accent"
        avatarSecondColor="warning"
        onChange={vi.fn()}
      />,
    );
    const pressed = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((button) => button.getAttribute('aria-label'))).toEqual([
      pairLabel('accent', 'warning'),
    ]);
  });

  it('marks the saved solid, and no pair', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="success"
        avatarSecondColor={null}
        onChange={vi.fn()}
      />,
    );
    const pressed = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((button) => button.getAttribute('aria-label'))).toEqual([
      COPY.avatarColorSwatchAriaLabel('success'),
    ]);
  });

  // A profile with no colour draws the house pair, so the board's first swatch
  // is the selected one.
  it('selects the house pair for a profile with no colour yet', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor={null}
        avatarSecondColor={null}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText(pairLabel('signal', 'accent')),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('hands a pair, or a solid with a null second colour, to onChange', () => {
    const onChange = vi.fn();
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="signal"
        avatarSecondColor="accent"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(pairLabel('success', 'signal')));
    expect(onChange).toHaveBeenLastCalledWith('success', 'signal');
    fireEvent.click(
      screen.getByLabelText(COPY.avatarColorSwatchAriaLabel('warning')),
    );
    expect(onChange).toHaveBeenLastCalledWith('warning', null);
  });

  it('previews the avatar centred, in a ring', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="signal"
        avatarSecondColor="accent"
        onChange={vi.fn()}
      />,
    );
    const preview = screen.getByTestId('avatar-picker-preview');
    expect(preview).toHaveStyle({ width: '114px', height: '114px' });
    expect(preview.textContent).toBe('A');
  });
});
