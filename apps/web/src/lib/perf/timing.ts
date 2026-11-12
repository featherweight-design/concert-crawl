// Server timing for the web app (perf audit rec 8). Off unless PERF_TIMING=1:
// then each API call the server makes and each instrumented page logs one JSON
// line to stdout (Vercel runtime logs), so a slow route is named, not guessed.
//
//   perf.api    one web-to-API call: path (no query values), whether it carried
//               a token, status, time to the first byte and to the whole body.
//   perf.route  one instrumented page render, start to end.
//
// Read them with `vercel logs <deployment> | grep '"event":"perf\.'` or from
// the Vercel logs UI filtered on `perf.`. Never logs a token, a header or a
// query value (a search term can be personal).

const enabled = (): boolean => process.env['PERF_TIMING'] === '1';

const roundMs = (ms: number): number => Math.round(ms * 10) / 10;

/** The path with the query values dropped: `/v1/events?q=x&page=2` becomes
 * `/v1/events?q&page`. */
export const redactQuery = (path: string): string => {
  const at = path.indexOf('?');
  if (at === -1) return path;
  const names = path
    .slice(at + 1)
    .split('&')
    .map((pair) => pair.split('=')[0] ?? '')
    .filter((name) => name !== '');
  return names.length === 0
    ? path.slice(0, at)
    : `${path.slice(0, at)}?${names.join('&')}`;
};

const log = (line: Record<string, unknown>): void => {
  // One line per event: the log drain parses it as JSON.
  console.log(JSON.stringify(line));
};

export interface ApiTimer {
  /** Headers are back. */
  headers: (status: number) => void;
  /** The body is read (or the call failed). */
  done: () => void;
}

/** A timer for one API call; a no-op unless PERF_TIMING=1. */
export const startApiTimer = (
  method: string,
  path: string,
  authed: boolean,
): ApiTimer => {
  if (!enabled()) return { headers: () => {}, done: () => {} };
  const started = performance.now();
  let ttfb: number | null = null;
  let status: number | null = null;
  return {
    headers: (code) => {
      status = code;
      ttfb = performance.now() - started;
    },
    done: () => {
      const total = performance.now() - started;
      log({
        event: 'perf.api',
        method,
        path: redactQuery(path),
        authed,
        status,
        ttfbMs: roundMs(ttfb ?? total),
        totalMs: roundMs(total),
      });
    },
  };
};

/** Wrap a page (or any async function) so its whole run is logged as one
 * `perf.route` line. Unchanged behaviour with the switch off. */
export const perfRoute =
  <Args extends unknown[], Result>(
    route: string,
    fn: (...args: Args) => Promise<Result>,
  ) =>
  async (...args: Args): Promise<Result> => {
    if (!enabled()) return fn(...args);
    const started = performance.now();
    try {
      return await fn(...args);
    } finally {
      log({
        event: 'perf.route',
        route,
        ms: roundMs(performance.now() - started),
      });
    }
  };
