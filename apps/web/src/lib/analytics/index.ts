// Barrel for the web analytics module. Components import `track` from here to
// fire typed events — the monetization funnel plus poster sharing (#72);
// layout wires the PostHogProvider.
export { track, isAnalyticsEnabled } from './client'
export { PostHogProvider } from './PostHogProvider'
