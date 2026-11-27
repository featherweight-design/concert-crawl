import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadE2eEnvLocal, parseEnvLocal } from './env-local.js';

describe('loadE2eEnvLocal', () => {
  let root: string;
  const keys = [
    'ENVLOCAL_HASH',
    'ENVLOCAL_AT',
    'ENVLOCAL_DOLLAR',
    'ENVLOCAL_EQ',
    'ENVLOCAL_SPACE',
    'ENVLOCAL_SINGLE',
    'ENVLOCAL_DOUBLE',
    'ENVLOCAL_PRESET',
    'ENVLOCAL_AFTER_COMMENT',
  ];

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-local-test-'));
    fs.mkdirSync(path.join(root, 'apps/e2e'), { recursive: true });
  });

  afterEach(() => {
    for (const key of keys) delete process.env[key];
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('keeps symbols in unquoted and quoted values whole', () => {
    fs.writeFileSync(
      path.join(root, 'apps/e2e/.env.local'),
      [
        '# a comment line',
        '   # an indented comment',
        '',
        'ENVLOCAL_HASH=ab#cd',
        'ENVLOCAL_AT=name@host.test',
        'ENVLOCAL_DOLLAR=ab$cd${ef}',
        'ENVLOCAL_EQ=ab=cd==',
        'ENVLOCAL_SPACE=  ab cd  ',
        "ENVLOCAL_SINGLE='x#y z'",
        'ENVLOCAL_DOUBLE="x#y z"',
        'ENVLOCAL_AFTER_COMMENT=last',
      ].join('\n'),
    );
    loadE2eEnvLocal(root);
    expect(process.env['ENVLOCAL_HASH']).toBe('ab#cd');
    expect(process.env['ENVLOCAL_AT']).toBe('name@host.test');
    expect(process.env['ENVLOCAL_DOLLAR']).toBe('ab$cd${ef}');
    expect(process.env['ENVLOCAL_EQ']).toBe('ab=cd==');
    expect(process.env['ENVLOCAL_SPACE']).toBe('ab cd');
    expect(process.env['ENVLOCAL_SINGLE']).toBe('x#y z');
    expect(process.env['ENVLOCAL_DOUBLE']).toBe('x#y z');
    expect(process.env['ENVLOCAL_AFTER_COMMENT']).toBe('last');
  });

  it('lets a real environment value win over the file', () => {
    process.env['ENVLOCAL_PRESET'] = 'from-shell';
    fs.writeFileSync(
      path.join(root, 'apps/e2e/.env.local'),
      'ENVLOCAL_PRESET=from-file\n',
    );
    loadE2eEnvLocal(root);
    expect(process.env['ENVLOCAL_PRESET']).toBe('from-shell');
  });

  it('does nothing when the file is missing', () => {
    expect(() => loadE2eEnvLocal(root)).not.toThrow();
    expect(process.env['ENVLOCAL_HASH']).toBeUndefined();
  });
});

describe('parseEnvLocal', () => {
  it('removes only one matching pair of quotes', () => {
    expect(parseEnvLocal(`A="'x'"\nB='x"\nC=""`)).toEqual({
      A: "'x'",
      B: `'x"`,
      C: '',
    });
  });

  it('ignores lines with no key or no equals sign', () => {
    expect(parseEnvLocal('=novalue\njusttext\r\nK=v\r\n')).toEqual({ K: 'v' });
  });
});
