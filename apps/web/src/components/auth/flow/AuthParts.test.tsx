// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AuthField, PasswordField } from './AuthField';
import { CodeBoxes } from './CodeBoxes';
import { ConsentCheck, LegalLink } from './ConsentCheck';
import { PrimaryButton } from './AuthButtons';
import { StepTrail } from './AuthNotices';
import { AUTH_FLOW_COPY } from './definitions/copy';

const COPY = AUTH_FLOW_COPY;

afterEach(cleanup);

describe('AuthField', () => {
  it('wires the error to the input and marks it invalid', () => {
    render(
      <AuthField label="Email" error="Enter an email like you@example.com." />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const note = screen.getByText('Enter an email like you@example.com.');
    expect(input.getAttribute('aria-describedby')).toBe(
      note.closest('p')?.getAttribute('id'),
    );
  });

  it('shows the hint while valid and disables a locked field', () => {
    render(<AuthField label="Email" hint="A hint." disabled />);
    expect(screen.getByText('A hint.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });
});

describe('PasswordField', () => {
  it('toggles between masked and shown', () => {
    render(<PasswordField label="Password" defaultValue="secret" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(
      screen.getByRole('button', { name: COPY.password.showLabel }),
    );
    expect(input).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: COPY.password.hideLabel }),
    ).toBeInTheDocument();
  });
});

describe('CodeBoxes', () => {
  function Harness({ onValue }: { onValue: (next: string) => void }) {
    const [value, setValue] = useState('');
    return (
      <CodeBoxes
        value={value}
        onChange={(next) => {
          setValue(next);
          onValue(next);
        }}
      />
    );
  }

  it('is one one-time-code input that takes a pasted code and keeps only six digits', () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByLabelText(COPY.code.label);
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(input, { target: { value: '12 34-56 78' } });
    expect(onValue).toHaveBeenLastCalledWith('123456');
  });

  it('takes focus back, cleared, when it unlocks after a wrong code', () => {
    const { rerender } = render(
      <CodeBoxes value="123456" onChange={() => {}} />,
    );
    const input = screen.getByLabelText(COPY.code.label);
    input.focus();
    expect(input).toHaveFocus();
    // The press locks the boxes; a browser drops focus from a disabled input.
    rerender(<CodeBoxes value="123456" onChange={() => {}} disabled />);
    input.blur();
    expect(input).not.toHaveFocus();
    rerender(<CodeBoxes value="" onChange={() => {}} error="Wrong." />);
    expect(screen.getByLabelText(COPY.code.label)).toHaveFocus();
  });

  it('does not take focus when the visitor was not in the boxes', () => {
    const { rerender } = render(
      <CodeBoxes value="123456" onChange={() => {}} disabled />,
    );
    rerender(<CodeBoxes value="" onChange={() => {}} />);
    expect(screen.getByLabelText(COPY.code.label)).not.toHaveFocus();
  });

  it('does not take focus when the visitor left the boxes themselves', () => {
    const { rerender } = render(<CodeBoxes value="123" onChange={() => {}} />);
    const input = screen.getByLabelText(COPY.code.label);
    input.focus();
    input.blur();
    rerender(<CodeBoxes value="123" onChange={() => {}} disabled />);
    rerender(<CodeBoxes value="" onChange={() => {}} />);
    expect(screen.getByLabelText(COPY.code.label)).not.toHaveFocus();
  });

  it('keeps what was typed when it unlocks after a right code', () => {
    const { rerender } = render(
      <CodeBoxes value="123456" onChange={() => {}} />,
    );
    screen.getByLabelText(COPY.code.label).focus();
    rerender(<CodeBoxes value="123456" onChange={() => {}} disabled />);
    screen.getByLabelText(COPY.code.label).blur();
    rerender(<CodeBoxes value="123456" onChange={() => {}} />);
    expect(screen.getByLabelText(COPY.code.label)).not.toHaveFocus();
  });

  it('marks all six invalid with the message', () => {
    render(<CodeBoxes value="123456" onChange={() => {}} error="Wrong." />);
    expect(screen.getByLabelText(COPY.code.label)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText('Wrong.')).toBeInTheDocument();
  });
});

describe('ConsentCheck', () => {
  it('starts unticked, toggles from the card, and a document link never toggles it', () => {
    const onLink = vi.fn();
    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <ConsentCheck checked={on} onChange={setOn}>
          {COPY.consent.lead}
          <LegalLink href="/legal/terms" onClick={onLink}>
            {COPY.consent.terms}
          </LegalLink>
        </ConsentCheck>
      );
    }
    render(<Harness />);
    const box = screen.getByRole('checkbox');
    expect(box).not.toBeChecked();
    const link = screen.getByRole('link', { name: COPY.consent.terms });
    expect(link).toHaveAttribute('href', '/legal/terms');
    fireEvent.click(link);
    expect(onLink).toHaveBeenCalledOnce();
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(box).toBeChecked();
  });

  it('reads the error out and marks the box invalid', () => {
    render(
      <ConsentCheck
        checked={false}
        onChange={() => {}}
        error={COPY.consent.error}
      >
        x
      </ConsentCheck>,
    );
    expect(screen.getByRole('checkbox')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText(COPY.consent.error)).toBeInTheDocument();
  });
});

describe('PrimaryButton', () => {
  it('holds the press while busy and says what it is doing', () => {
    render(
      <PrimaryButton busy busyLabel="Making your account…">
        Continue
      </PrimaryButton>,
    );
    const button = screen.getByRole('button', { name: 'Making your account…' });
    // Held with aria-disabled, not `disabled`, so focus stays on the button.
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('StepTrail', () => {
  it('names the step and the total, and the finished state', () => {
    const { rerender } = render(<StepTrail step={2} total={3} />);
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    rerender(<StepTrail step={3} total={3} done />);
    expect(screen.getByText(COPY.steps.done)).toBeInTheDocument();
  });
});
