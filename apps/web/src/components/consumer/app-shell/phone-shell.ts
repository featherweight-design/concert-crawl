/**
 * The app chrome's outer block, shared by the (main) layout and the global
 * 404 so the two cannot drift.
 *
 * - `min-h-dvh`: the dynamic viewport. `100vh` is the LARGEST viewport (browser
 *   bars retracted), so at scroll-top the shell was a toolbar's height taller
 *   than the screen.
 * - `pb-[env(safe-area-inset-bottom)]`: the fixed BottomNav is 52px plus the
 *   bottom inset. Each page's own bottom padding (pb-20 and up) clears the
 *   52px; this adds the inset beneath it, so the page keeps its drawn gap above
 *   the nav at any inset. Dropped from lg (1024), where the nav is hidden.
 * - `pl/pr-[env(safe-area-inset-*)]`: in landscape on a notched phone the
 *   side insets are live (viewport-fit=cover), and nothing may sit under the
 *   notch.
 *
 * `overflow-x-clip` and `page-ambient`: see the (main) layout.
 */
export const PHONE_SHELL_CLASS =
  'page-ambient flex min-h-dvh flex-col overflow-x-clip pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:pb-0';

/**
 * The page column under the header and above the bottom nav (tablet option A,
 * `10-tablet/tablet-a`): the phone layout holds to 1023, and from 640 up its
 * column stops at 640 and centres, while the header and the nav keep the full
 * width. From 1024 the pages draw their own desktop containers.
 */
export const PHONE_COLUMN_CLASS =
  'mx-auto flex w-full max-w-[640px] flex-1 flex-col lg:max-w-none';
