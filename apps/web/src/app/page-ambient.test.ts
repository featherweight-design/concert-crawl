import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Whitespace-collapsed, so Prettier's line breaks never fail the pin.
const flat = (text: string): string =>
  text.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');

const css = flat(readFileSync(resolve(__dirname, 'globals.css'), 'utf8'));
const shell = readFileSync(
  resolve(__dirname, '(protected)/(main)/layout.tsx'),
  'utf8',
);

// B+ rule 1: the ambient page background, value for value from the Electric
// boards' root frame (`shelf-see-all-m`, `nll-row-browse-d`).
describe('page-ambient', () => {
  it('draws the board gradient on Electric and the SSR fallback', () => {
    const rule = css.slice(
      css.indexOf(':root:not([data-theme]) .page-ambient::before'),
    );
    expect(rule).toContain(
      ":root:not([data-theme]) .page-ambient::before, :root[data-theme='electric'] .page-ambient::before {",
    );
    expect(rule).toContain(
      'radial-gradient(1100px 650px at 0% 0%, rgba(188, 119, 242, 0.15), transparent 65%), radial-gradient(900px 650px at 100% 100%, rgba(122, 230, 255, 0.09), transparent 60%), linear-gradient(180deg, #0e1121, #070a1a)',
    );
    expect(rule).toContain('position: fixed;');
    expect(rule).toContain('z-index: -1;');
    expect(rule).toContain('pointer-events: none;');
  });

  it('keeps the flat --bg on every theme the boards give no values for', () => {
    expect(css).toContain('.page-ambient { background-color: var(--bg); }');
  });

  it('is the background of the main shell', () => {
    expect(shell).toMatch(/className="page-ambient /);
    expect(shell).not.toMatch(/overflow-x-clip bg-bg/);
  });
});
