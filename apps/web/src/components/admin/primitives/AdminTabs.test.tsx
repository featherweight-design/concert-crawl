// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdminTabs } from './AdminTabs';

type Key = 'one' | 'two' | 'three';
const TABS = [
  { key: 'one', label: 'One' },
  { key: 'two', label: 'Two' },
  { key: 'three', label: 'Three' },
] as const;

const Harness = ({
  variant,
  phone,
}: {
  variant?: 'underline' | 'segments';
  phone?: boolean;
}) => {
  const [value, setValue] = useState<Key>('one');
  return (
    <>
      <AdminTabs
        tabs={TABS}
        value={value}
        onChange={setValue}
        label="Sections"
        tabId={(key) => `tab-${key}`}
        panelId={(key) => `panel-${key}`}
        testId="tabs"
        {...(variant ? { variant } : {})}
        {...(phone ? { phone } : {})}
      />
      {TABS.map((tab) => (
        <div
          key={tab.key}
          id={`panel-${tab.key}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.key}`}
          hidden={tab.key !== value}
        >
          {tab.label} panel
        </div>
      ))}
    </>
  );
};

const tab = (name: string) => screen.getByRole('tab', { name });

afterEach(cleanup);

describe('AdminTabs', () => {
  it('draws a named tablist whose tabs control their panels', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeTruthy();
    expect(tab('Two').id).toBe('tab-two');
    expect(tab('Two').getAttribute('aria-controls')).toBe('panel-two');
    expect(tab('One').getAttribute('aria-selected')).toBe('true');
    expect(tab('Two').getAttribute('aria-selected')).toBe('false');
    // The panel names its tab, so the tab labels it.
    expect(screen.getByRole('tabpanel', { name: 'One' }).textContent).toBe(
      'One panel',
    );
  });

  it('keeps one tab in the Tab order (roving tabindex)', () => {
    render(<Harness />);
    expect(screen.getAllByRole('tab').map((each) => each.tabIndex)).toEqual([
      0, -1, -1,
    ]);
    fireEvent.click(tab('Three'));
    expect(screen.getAllByRole('tab').map((each) => each.tabIndex)).toEqual([
      -1, -1, 0,
    ]);
  });

  it('arrows move selection and focus, wrapping at both ends', () => {
    render(<Harness />);
    fireEvent.keyDown(tab('One'), { key: 'ArrowRight' });
    expect(tab('Two').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('Two'));
    fireEvent.keyDown(tab('Two'), { key: 'ArrowRight' });
    fireEvent.keyDown(tab('Three'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('One'));
    fireEvent.keyDown(tab('One'), { key: 'ArrowLeft' });
    expect(tab('Three').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('Three'));
  });

  it('Home and End jump to the first and last tab', () => {
    render(<Harness />);
    fireEvent.keyDown(tab('One'), { key: 'End' });
    expect(document.activeElement).toBe(tab('Three'));
    fireEvent.keyDown(tab('Three'), { key: 'Home' });
    expect(document.activeElement).toBe(tab('One'));
    expect(tab('One').getAttribute('aria-selected')).toBe('true');
  });

  it('leaves other keys alone', () => {
    render(<Harness />);
    fireEvent.keyDown(tab('One'), { key: 'ArrowDown' });
    expect(tab('One').getAttribute('aria-selected')).toBe('true');
  });

  it('the phone underline strip scrolls sideways; segments do not', () => {
    render(<Harness phone />);
    expect(screen.getByTestId('tabs').style.overflowX).toBe('auto');
    expect(tab('One').style.padding).toBe('0px 10px');
    cleanup();
    render(<Harness variant="segments" />);
    expect(screen.getByTestId('tabs').style.overflowX).toBe('');
    expect(tab('One').style.flex).toContain('1');
  });

  it('segments keep side padding, so a shrink-to-fit strip never runs labels together', () => {
    render(<Harness variant="segments" />);
    expect(tab('One').style.padding).toBe('0px 12px');
  });
});
