// Vitest 5 widened `Assertion` to `Assertion<R, T>`, but
// @testing-library/jest-dom@7 still augments the single-parameter
// `Assertion<T>` its /vitest entry was written against — so the merge silently
// fails and every jest-dom matcher disappears from the type layer. Augment
// vitest's own `Matchers` extension point instead, which is the supported
// surface and whose shape both versions agree on. Drop this file once jest-dom
// ships Vitest 5 support.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown,
  > extends TestingLibraryMatchers<T, R> {}
}
