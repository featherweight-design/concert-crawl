// When the launch animation plays (B+ README rule 12): on a cold start of an
// installed app, never in a browser tab, never under reduced motion. It has no
// switch and waits on nothing: the decision reads only what is already on the
// device, so the animation can never hold the app.
//
// Two parties share the decision and neither can do the other's part, as in
// the-99's app loader:
//
// - `LAUNCH_DETECT` is an inline script in the root layout's head. It runs
//   while the document parses, before the first paint, and marks `<html>` with
//   `data-launch`. Only an inline script is early enough: the overlay has to be
//   on screen in the very first frame, and it has to start its CSS animation
//   there, not after hydration (a slow Android phone's hydration outlasted the
//   old JS animation, which finished unseen). It only reads.
// - The overlay (`LaunchAnimation`) is rendered by the signed-in shell alone,
//   so it alone writes `LAUNCH_PLAYED_KEY`. A signed-out document has no
//   overlay to play, and a flag written there would use up the next cold start.
//
// `sessionStorage` is the lifetime of "cold start": the installed app's window
// gets a fresh one per launch and keeps it across reloads and navigations.

export const LAUNCH_PLAYED_KEY = 'cc-launch-played';
export const LAUNCH_ATTR = 'data-launch';

/** Every beat of the timeline, in ms from frame 0 (README rule 12). */
export const LAUNCH_MS = {
  tileFadeEnd: 110,
  growStart: 110,
  growEnd: 360,
  trailStart: 300,
  trailEnd: 590,
  trailStep: 32,
  wordStart: 400,
  wordEnd: 580,
  coreBlueEnd: 690,
  pulseStart: 680,
  pulseEnd: 840,
  shrinkStart: 860,
  total: 1040,
} as const;

/** Header logo spot the mark lands in: 28px at (16, 15). */
export const LAUNCH_LANDING = { size: 28, left: 16, top: 15 } as const;

/**
 * Runs in the head, so it is a plain string rather than a function's
 * `toString()` (a build may rewrite a function's source). It is the one copy of
 * the decision; `launch.test.ts` runs it against stubbed windows. It also hands
 * the CSS the viewport (`--ll-w`, `--ll-h`, unitless px) that the animation's
 * positions are measured from, because `calc()` cannot divide one length by
 * another yet.
 */
export const LAUNCH_DETECT =
  '(function(){try{var w=window,m=w.matchMedia.bind(w);' +
  'if(!(m("(display-mode: standalone)").matches||w.navigator.standalone===true))return;' +
  'if(m("(prefers-reduced-motion: reduce)").matches)return;' +
  `if(w.sessionStorage.getItem("${LAUNCH_PLAYED_KEY}"))return;` +
  'var d=document.documentElement;' +
  `d.setAttribute("${LAUNCH_ATTR}","1");` +
  'd.style.setProperty("--ll-w",String(w.innerWidth));' +
  'd.style.setProperty("--ll-h",String(w.innerHeight))' +
  '}catch(e){}})();';

/** Called once by the overlay: this session has had its launch (or needed none). */
export const markLaunchPlayed = (): void => {
  try {
    window.sessionStorage.setItem(LAUNCH_PLAYED_KEY, '1');
  } catch {
    // Storage blocked: the animation may play again on a reload. Harmless.
  }
};

/** The overlay is done: stop `data-launch` showing it. */
export const endLaunch = (): void => {
  document.documentElement.removeAttribute(LAUNCH_ATTR);
};
