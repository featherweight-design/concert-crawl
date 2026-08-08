// Bell copy for Concert Crews activity (#1226 PR-7). Crew notifications are
// bell-only — none of the three categories is push-eligible — so these strings
// only ever render inside the notification panel, where the crew name already
// sits in the row's eyebrow. That is why no title repeats it for `going`.
//
// "Someone" is the fallback for a member with no handle, matching the invite
// landing (crews copy `landing.titleNoName`). We never invent a name.

export const CREW_NOTIFICATION_ACTOR_FALLBACK = 'Someone'

export const crewNotificationCopy = {
  going: (who: string, artistAtVenue: string) => ({
    title: `${who} is going to ${artistAtVenue}.`,
    body: '',
  }),
  joined: (who: string, crewName: string) => ({
    title: `${who} joined ${crewName}.`,
    body: '',
  }),
  left: (who: string, crewName: string) => ({
    title: `${who} left ${crewName}.`,
    body: '',
  }),
}
