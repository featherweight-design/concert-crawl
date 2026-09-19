// Vitest 5 widened `Assertion` to `Assertion<R, T>`, but
// @testing-library/jest-dom@7 still augments the single-parameter
// `Assertion<T>` its /vitest entry was written against — so the merge silently
// fails and every jest-dom matcher disappears from the type layer.
//
// Augment Vitest's own `Matchers` extension point instead. It is the surface
// Vitest documents for custom matchers, and unlike `Assertion` it is declared
// empty, so nothing here has to line up with jest-dom's own declarations. The
// two parameters below match Vitest 5's arity exactly and are NOT portable to
// Vitest 4, which declares `Matchers<T = any>` — a downgrade would need this
// file changed, not just the dependency reverted.
//
// Delete this file once jest-dom ships Vitest 5 support: its own augmentation
// will then collide with this one.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown,
  > extends TestingLibraryMatchers<T, R> {}
}
