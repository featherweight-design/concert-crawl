// @vitest-environment node

import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';
import { CLERK_JS_VERSION, CLERK_UI_VERSION } from './clerk-scripts';

// `@clerk/shared` is not a dependency of this app, only of `@clerk/nextjs`, so
// it is found beside it.
const nextjs = realpathSync(join(process.cwd(), 'node_modules/@clerk/nextjs'));
const loader = readFileSync(
  join(nextjs, '../shared/dist/loadClerkJsScript.mjs'),
  'utf8',
);
const selector = readFileSync(
  join(nextjs, '../shared/dist/versionSelector.mjs'),
  'utf8',
);

/** The release each script's selector defaults to when no version is given, as the SDK ships it. */
const sdkDefault = {
  js: selector.match(
    /versionSelector = \(clerkJSVersion, packageVersion = "([^"]+)"\)/,
  )?.[1],
  ui: loader.match(
    /versionSelector\(__internal_clerkUIVersion, "([^"]+)"\)/,
  )?.[1],
};
const major = (version: string | undefined) => version?.split('.')[0];

/** True when `version` is the same release as `floor` or a newer one. */
const atLeast = (version: string, floor: string | undefined): boolean => {
  const have = version.split('.').map(Number);
  const need = (floor ?? '').split('.').map(Number);
  for (let i = 0; i < need.length; i += 1) {
    const diff = (have[i] ?? 0) - (need[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
};

describe('the pinned Clerk script versions', () => {
  it('are in the major the installed SDK asks for', () => {
    expect(
      sdkDefault.js,
      'clerk-js default not found in @clerk/shared',
    ).toBeDefined();
    expect(
      sdkDefault.ui,
      'ui default not found in @clerk/shared',
    ).toBeDefined();
    expect(major(CLERK_JS_VERSION)).toBe(major(sdkDefault.js));
    expect(major(CLERK_UI_VERSION)).toBe(major(sdkDefault.ui));
  });

  // The pin is the only thing that decides which Clerk script a reader runs, so
  // it must not fall behind the release the installed SDK was built against.
  // Dependabot bumps `@clerk/nextjs`, which moves these defaults, and this test
  // then fails until the pin is raised to match: security and bug fixes cannot
  // stay on an old script behind a green build.
  it('are not older than the release the installed SDK was built against', () => {
    expect(
      atLeast(CLERK_JS_VERSION, sdkDefault.js),
      `CLERK_JS_VERSION ${CLERK_JS_VERSION} is older than the SDK's ${sdkDefault.js}; raise it in src/lib/clerk-scripts.ts`,
    ).toBe(true);
    expect(
      atLeast(CLERK_UI_VERSION, sdkDefault.ui),
      `CLERK_UI_VERSION ${CLERK_UI_VERSION} is older than the SDK's ${sdkDefault.ui}; raise it in src/lib/clerk-scripts.ts`,
    ).toBe(true);
  });

  it('are exact releases, which the frontend API serves with no redirect', () => {
    for (const version of [CLERK_JS_VERSION, CLERK_UI_VERSION]) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('reach the browser through the variables the SDK reads', () => {
    expect(nextConfig.env).toMatchObject({
      NEXT_PUBLIC_CLERK_JS_VERSION: CLERK_JS_VERSION,
      NEXT_PUBLIC_CLERK_UI_VERSION: CLERK_UI_VERSION,
    });
  });
});
