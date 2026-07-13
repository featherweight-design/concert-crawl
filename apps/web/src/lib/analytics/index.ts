// Barrel for the web analytics module. Components import `track` from here to
// fire typed monetization funnel events; layout wires the PostHogProvider.
export { track, isAnalyticsEnabled } from './client'
export { PostHogProvider } from './PostHogProvider'
