// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PersonAvatar } from './PersonAvatar';

afterEach(cleanup);

describe('PersonAvatar', () => {
  it('draws the two colours the person chose', () => {
    render(
      <PersonAvatar
        initialOf="mira.k"
        avatarColor="signal"
        avatarSecondColor="accent"
        size={38}
      />,
    );
    const disc = screen.getByTestId('person-avatar');
    expect(disc).toHaveTextContent('M');
    expect(disc).toHaveAttribute('data-avatar-first', 'signal');
    expect(disc).toHaveAttribute('data-avatar-second', 'accent');
    expect(disc.style.background).toContain('var(--signal)');
    expect(disc.style.background).toContain('var(--accent)');
  });

  it('gives a person who chose nothing the house pair, and one colour solid', () => {
    const { rerender } = render(
      <PersonAvatar
        initialOf={null}
        avatarColor={null}
        avatarSecondColor={null}
        size={32}
      />,
    );
    let disc = screen.getByTestId('person-avatar');
    expect(disc).toHaveTextContent('?');
    expect(disc).toHaveAttribute('data-avatar-first', 'signal');
    expect(disc).toHaveAttribute('data-avatar-second', 'accent');

    rerender(
      <PersonAvatar
        initialOf="dlo"
        avatarColor="success"
        avatarSecondColor={null}
        size={32}
      />,
    );
    disc = screen.getByTestId('person-avatar');
    expect(disc).toHaveAttribute('data-avatar-first', 'success');
    expect(disc).toHaveAttribute('data-avatar-second', 'success');
  });
});
