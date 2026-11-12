// The exact Clerk script versions the browser loads.
//
// Left unset, Clerk asks for a MAJOR tag (`clerk-js@6`, `ui@1`), and its frontend API answers each
// with a 307 to the newest release in that major, marked `private, no-store`. So every full page
// load paid two uncacheable redirects before either script, a round trip each. An exact version is
// served `immutable` with no redirect.
//
// Pinned by hand because nothing installed names the exact release: `@clerk/shared` carries only
// the major it targets. `clerk-scripts.test.ts` reads that major out of the installed package and
// fails when a dependency bump moves it, so a pin can never point at a major the SDK no longer
// speaks. Within the major, bumping these is how a reader gets Clerk's fixes: request the tag
// (`/npm/@clerk/clerk-js@6/dist/clerk.browser.js`) and read the redirect for the current release.
//
// Set to the releases the major tags resolved to on 2026-11-12, so pinning changes where the
// browser gets them from and not what it runs.
export const CLERK_JS_VERSION = '6.42.3';
export const CLERK_UI_VERSION = '1.42.4';
