// When the launch animation plays (B+ README rule 12): on a cold start of an
// installed app, never in a browser tab, never under reduced motion, and only
// while the `launch-animation` flag is on. The flag arrives over the network
// after first paint, so the last answer is kept on the device and read
// synchronously on the next cold start: the animation must never hold the app
// waiting for a flag.

export const LAUNCH_PLAYED_KEY = 'cc-launch-played';
export const LAUNCH_FLAG_KEY = 'cc-launch-flag';

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
  coreBlueStart: 600,
  coreBlueEnd: 690,
  pulseStart: 680,
  pulseEnd: 840,
  shrinkStart: 860,
  total: 1040,
} as const;

/** Header logo spot the mark lands in: 28px at (16, 15). */
export const LAUNCH_LANDING = { size: 28, left: 16, top: 15 } as const;

export interface LaunchInputs {
  standalone: boolean;
  /** `sessionStorage` already holds the marker: not a cold start. */
  alreadyPlayed: boolean;
  /** The last flag answer stored on this device. */
  flagCached: boolean;
  reducedMotion: boolean;
}

export const shouldPlayLaunch = ({
  standalone,
  alreadyPlayed,
  flagCached,
  reducedMotion,
}: LaunchInputs): boolean =>
  standalone && !alreadyPlayed && flagCached && !reducedMotion;

export const isStandaloneDisplay = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  }
  // iOS Safari reports its home-screen mode here instead.
  return Reflect.get(window.navigator, 'standalone') === true;
};

/** Storage can throw (private mode, blocked site data): treat that as absent. */
export const readStored = (
  store: 'local' | 'session',
  key: string,
): string | null => {
  try {
    const area =
      store === 'local' ? window.localStorage : window.sessionStorage;
    return area.getItem(key);
  } catch {
    return null;
  }
};

export const writeStored = (
  store: 'local' | 'session',
  key: string,
  value: string,
): void => {
  try {
    const area =
      store === 'local' ? window.localStorage : window.sessionStorage;
    area.setItem(key, value);
  } catch {
    // Nothing to do: the worst case is a repeat of the animation.
  }
};
