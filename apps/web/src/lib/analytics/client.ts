// Web analytics: usage basics plus poster sharing.
//
// posthog-js records pageviews (including App Router client-side navigations)
// and autocaptured clicks for basic usage, and the typed share events below.
// Every event is keyed to the Clerk userId once the reader is identified.
// There are no typed billing or plan events (the app is moving to a free
// tier); autocapture still records a tap on a billing button like any other
// button, by its label.
//
// No-op unless NEXT_PUBLIC_POSTHOG_KEY is set AND the page is served from the
// production hostname (see PRODUCTION_HOSTNAMES): local dev and preview builds
// have no key, staging is kept out by the hostname even if it gets one, and
// neither gate ever breaks the UI. `client` gates every call, so
// track/identify are safe to call unconditionally.

import type { PostHog } from 'posthog-js';
import type { ShareEvent, ShareEventMap } from '@concert-crawl/types';
import { CAMPAIGN_PROPERTIES } from './definitions/campaign-properties';
import { redactCapture } from './redact';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

// Treat an empty string the same as unset — an env var that exists but has no
// value (common in preview/prod dashboards) must not pass '' to posthog.init.
const resolveHost = (value: string | undefined): string =>
  value === undefined || value.length === 0 ? DEFAULT_POSTHOG_HOST : value;

// Super-properties sent with every event: `release` is the short commit SHA
// of the build, `app_version` the root package version. Both are inlined by
// next.config.ts; a property with no value is left off rather than sent empty.
export const releaseProperties = (
  commitSha: string | undefined,
  appVersion: string | undefined,
): Record<string, string> => {
  const props: Record<string, string> = {};
  if (commitSha) props['release'] = commitSha.slice(0, 7);
  if (appVersion) props['app_version'] = appVersion;
  return props;
};

// Analytics runs on the production site only. The key is the first gate; the
// hostname is the second, because staging is a separate Vercel project that
// could be handed the production key by mistake, and its traffic must never
// reach the production PostHog project.
export const PRODUCTION_HOSTNAMES: readonly string[] = [
  'concertcrawl.app',
  'www.concertcrawl.app',
];

export const isProductionHostname = (hostname: string): boolean =>
  PRODUCTION_HOSTNAMES.includes(hostname.toLowerCase());

// Any URL on the admin (`/admin` and below), matched against the full href.
export const ADMIN_URL = /^https?:\/\/[^/]+\/admin(?:[/?#]|$)/i;

// The posthog-js SDK is a separate chunk, fetched only once the gates below
// pass (after Clerk has loaded), so it is not in the first-load bundle of any
// route. `client` is set when init succeeds and doubles as the "initialized"
// flag; `starting` makes concurrent initAnalytics calls share one load.
let client: PostHog | null = null;
let starting: Promise<void> | null = null;

// Share events fired while the SDK is still loading, replayed once it is up so
// a quick tap is not lost. Bounded; dropped if the load fails.
const MAX_PENDING_EVENTS = 20;
let pending: Array<(posthog: PostHog) => void> = [];

// `posthog.reset()` clears super-properties along with the identity, so this
// runs after every reset as well as at init.
const registerRelease = (posthog: PostHog): void => {
  posthog.register(
    releaseProperties(
      process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'],
      process.env['NEXT_PUBLIC_PACKAGE_VERSION'],
    ),
  );
};

// `hostname` defaults to the page's own; tests pass one in. Resolves when
// analytics is running or has been ruled out (gates, failure); never rejects.
// Callers that identify the reader must await it, so identity is settled
// before posthog-js's first pageview.
export const initAnalytics = (hostname?: string): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();
  const apiKey = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  if (apiKey === undefined || apiKey.length === 0) return Promise.resolve();
  if (!isProductionHostname(hostname ?? window.location.hostname)) {
    return Promise.resolve();
  }
  starting ??= (async () => {
    try {
      const { default: posthog } = await import('posthog-js');
      startPostHog(posthog, apiKey);
      const queued = pending;
      pending = [];
      for (const send of queued) send(posthog);
    } catch (err) {
      // A misconfiguration, blocked storage, a failed chunk fetch or an SDK
      // regression must never crash the app: leave analytics disabled. Clear
      // `starting` so a flaky-network chunk failure is retried by the next
      // call rather than cached for the page's life.
      console.error('analytics: posthog.init failed', err);
      starting = null;
      pending = [];
    }
  })();
  return starting;
};

const startPostHog = (posthog: PostHog, apiKey: string): void => {
  posthog.init(apiKey, {
    api_host: resolveHost(process.env['NEXT_PUBLIC_POSTHOG_HOST']),
    // Clicks, submits and changes on interactive elements. posthog-js never
    // records what is typed into an input, whatever the masking options say;
    // the options below only keep element text and attributes, so a
    // captured button still says what it was. Not on /admin: its rows carry
    // other readers' ids and contact details in text and hrefs. (Pageviews
    // still run there; ./redact takes the id out of /admin/users/<id> and
    // /admin/people/<id>.)
    autocapture: { url_ignorelist: [ADMIN_URL] },
    mask_all_text: false,
    mask_all_element_attributes: false,
    // Pageviews on load AND on App Router client-side navigations, which
    // change the URL through the History API without a page load.
    capture_pageview: 'history_change',
    disable_session_recording: true,
    respect_dnt: true,
    // Only build person profiles for signed-in (identified) users — anonymous
    // browsing does not need a profile.
    person_profiles: 'identified_only',
    // No campaign tags or ad click ids from the landing URL, and none of
    // the copies posthog-js keeps of them or of a search engine's keyword
    // (./redact drops the same names from $set and $set_once, which the
    // denylist does not reach).
    save_campaign_params: false,
    property_denylist: [...CAMPAIGN_PROPERTIES],
    // Invite tokens and query strings never leave the browser (./redact).
    before_send: redactCapture,
    // No /flags request: this app uses no PostHog flags, surveys or remote
    // config, and that request carries the initial URL (an invite token
    // included) as person properties, outside before_send's reach.
    advanced_disable_flags: true,
  });
  registerRelease(posthog);
  client = posthog;
};

export const isAnalyticsEnabled = (): boolean => client !== null;

// Bind subsequent events to the reader's Clerk userId.
export const identifyUser = (userId: string): void => {
  if (!client) return;
  try {
    client.identify(userId);
  } catch (err) {
    console.error('analytics: identify failed', err);
  }
};

// The identified reader's `name` person property: their display name (the
// profile handle, see PostHogProvider), never an email. A reader with no
// handle has the property removed, so a handle they cleared does not stay
// behind in PostHog.
export const setPersonName = (name: string | null): void => {
  if (!client) return;
  try {
    if (name) {
      client.setPersonProperties({ name });
    } else {
      client.unsetPersonProperties('name');
    }
  } catch (err) {
    console.error('analytics: set name failed', err);
  }
};

// Drop the identity on sign-out so a shared device does not attribute the
// next user's events to the previous one. Only an identified browser is
// reset: resetting an anonymous one would mint a new anonymous id on every
// signed-out page load and count each load as a new visitor.
export const resetAnalyticsIdentity = (): void => {
  if (!client) return;
  try {
    if (client.get_property('$user_state') !== 'identified') return;
    client.reset();
    registerRelease(client);
  } catch (err) {
    console.error('analytics: reset failed', err);
  }
};

// Typed client-side capture. Share events (#72) only: `event` constrains
// `properties` to that event's shape via the shared contract, so a wrong
// property name or type, or a billing event, is a compile error. No-ops
// (never throws) when analytics is disabled. While the SDK is loading the
// event is queued and sent once it is up.
export const track = <TEvent extends ShareEvent>(
  event: TEvent,
  properties: ShareEventMap[TEvent],
): void => {
  const send = (posthog: PostHog): void => {
    try {
      posthog.capture(event, properties);
    } catch (err) {
      // A capture must never surface to the UI that fired it.
      console.error('analytics: capture failed', err);
    }
  };
  if (client) {
    send(client);
  } else if (starting && pending.length < MAX_PENDING_EVENTS) {
    pending.push(send);
  }
};
