export interface ReleaseItem {
  kind: 'added' | 'fixed' | 'changed' | 'removed'
  text: string
}

export interface ReleaseSpotlight {
  title: string
  tagline: string
  /** Which animated hero to render inside SpotlightHero. Only 'map' exists today. */
  hero: string
  cta?: string
  ctaHref?: string
  steps: Array<{ caption: string }>
  founderNote?: string | [string] | [string, string] | [string, string, string]
  founderEyebrow?: string
  founderSign?: string
}

export interface Release {
  version: string
  date: string
  headline?: string | null
  items: ReleaseItem[]
  spotlight?: ReleaseSpotlight
}

// The v0.20.0-beta entry announcing public browse was pulled when that vertical
// was put behind the NEXT_PUBLIC_PUBLIC_BROWSE launch gate (see
// `src/lib/launch-mode.ts`): it is built but unreachable until the flag flips,
// and a changelog cannot truthfully announce something nobody can do yet.
// Restore it, redated, as part of launch.
export const RELEASES: Release[] = [
  {
    version: 'v0.36.0-beta',
    date: 'Aug 8, 2026',
    headline: 'Following an artist finally does something.',
    items: [
      {
        kind: 'fixed',
        text: 'New Denver dates used to only reach people who followed an artist through Spotify, and now any follow gets you the alert.',
      },
      {
        kind: 'changed',
        text: 'Following an artist is a Premium feature from here on, though anyone already following someone keeps them.',
      },
      {
        kind: 'changed',
        text: 'Connecting Spotify is switched off while we sit at the cap Spotify gives apps our size, but existing connections keep working.',
      },
    ],
  },
  {
    version: 'v0.35.0-beta',
    date: 'Aug 8, 2026',
    headline: 'Go with your people.',
    items: [
      {
        kind: 'added',
        text: 'Crews. Start one, send the link to up to eleven friends, and you get a shared page: everyone in it, the shows any of you are going to, and a patch that belongs to that crew and nobody else.',
      },
      {
        kind: 'added',
        text: 'When someone in your crew marks a show, you hear about it. Crew news lands in your bell and only in your bell, so nothing here can ever buzz your phone.',
      },
      {
        kind: 'added',
        text: 'One crew talking more than you want it to? Mute it in Settings. It is per crew, so the rest keep coming through.',
=======
    headline: 'Following an artist finally does something.',
    items: [
      {
        kind: 'fixed',
        text: 'New Denver dates used to only reach people who followed an artist through Spotify, and now any follow gets you the alert.',
      },
      {
        kind: 'changed',
        text: 'Following an artist is a Premium feature from here on, though anyone already following someone keeps them.',
      },
      {
        kind: 'changed',
        text: 'Connecting Spotify is switched off while we sit at the cap Spotify gives apps our size, but existing connections keep working.',
>>>>>>> 74a62d17c (docs: release note and progress row for artist fan-out)
      },
    ],
  },
  {
    version: 'v0.34.0-beta',
    date: 'Aug 3, 2026',
    headline: 'The date stops disappearing.',
    items: [
      {
        kind: 'fixed',
        text: 'On a narrow phone, a show in Watching could lose its date and read “Mission Ballroom · Sat…”. The date is now the last thing a row gives up, so the venue shortens instead.',
      },
      {
        kind: 'changed',
        text: 'Every show sits in the same row now, whether you found it browsing, on the calendar, or in Watching.',
      },
      {
        kind: 'changed',
        text: 'The eye on a browse row tells you a show is already on your list rather than acting as a button. Watching is turned on and off on the show’s own page.',
      },
    ],
  },
  {
    version: 'v0.33.0-beta',
    date: 'Aug 3, 2026',
    headline: 'Both names on the bill.',
    items: [
      {
        kind: 'fixed',
        text: 'When two acts share a bill, we used to file the show under whichever name came first and quietly treat the other one as an opener. Every co-headliner now counts as a headliner, so a shared bill turns up on both artists’ pages and both of them trip your Following badge.',
      },
      {
        kind: 'fixed',
        text: 'We are going back over the shows already on the calendar and re-reading their bills the same way, so older listings catch up too.',
      },
    ],
  },
  {
    version: 'v0.32.0-beta',
    date: 'Aug 3, 2026',
    headline: 'The Watch button says what it does.',
    items: [
      {
        kind: 'changed',
        text: 'Watching a show from its page is now one wide control that tells you what watching gets you, and whoever else is watching sits right underneath it instead of off on its own.',
      },
      {
        kind: 'changed',
        text: 'The full list of who else is watching now opens over the page instead of pushing everything below it down.',
      },
      {
        kind: 'changed',
        text: 'If marking yourself as going fails, the button itself is the retry, and it tells you your watch came through anyway.',
      },
    ],
  },
  {
    version: 'v0.31.1-beta',
    date: 'Aug 3, 2026',
    headline: 'Prices you send in stop vanishing.',
    items: [
      {
        kind: 'fixed',
        text: "A price you sent in for a show that already had one used to vanish; it now sits under the headline price on the show page, where anyone who's seen the same number can confirm it.",
      },
      {
        kind: 'fixed',
        text: 'The submit form no longer offers you a tier you already sent a price for, and the show page finally lets you edit that price instead of erroring.',
      },
    ],
  },
  {
    version: 'v0.31.0-beta',
    date: 'Aug 3, 2026',
    headline: 'Your year, stamped.',
    items: [
      {
        kind: 'added',
        text: "Every show you marked yourself going to now adds up to something. Open your Passport from the top of your History and you get a card — a wall of stamps, one per night, plus the count of rooms you've been in, the artists you've seen, and the genre you keep coming back to whether you meant to or not.",
      },
      {
        kind: 'added',
        text: 'Share it through your phone or save the image. It picks up whichever theme you have the app set to, so it looks like the thing you actually use.',
      },
    ],
  },
  {
    version: 'v0.30.0-beta',
    date: 'Aug 3, 2026',
    headline: 'Meow Wolf is on the calendar.',
    items: [
      {
        kind: 'fixed',
        text: 'Meow Wolf Denver has been listed for a while and showing nothing, which is a strange way to run a venue page. Their site builds its calendar in the browser after the page loads, and we were reading the empty version. We read the real list now — 26 shows through November, doors times and opening acts included. The burlesque and comedy nights they also run are in there but stay off the calendar, because you came here for concerts.',
      },
    ],
  },
  {
    version: 'v0.29.0-beta',
    date: 'Aug 2, 2026',
    headline: 'Shows you can actually post.',
    items: [
      {
        kind: 'added',
        text: "There's a share button in the top right of every show now. Tap it and you get a poster — the artwork we generate for that artist, their name across the bottom in type you can read from the back of the room, the date, the venue, and a line that is either funny or embarrassing depending on how the night goes. Story shape, square, or the wide one for a link preview.",
      },
      {
        kind: 'added',
        text: "Hand it straight to Instagram or Messages through your phone's own share sheet, save the image to your camera roll, or just copy the link. Whoever you send it to lands on a page that works whether or not they have an account.",
      },
      {
        kind: 'added',
        text: 'Paste that link anywhere — iMessage, Slack, a group chat, X — and it unfurls into the poster itself with the artist and the room named underneath. Nobody has to click a naked URL to find out what you sent them.',
      },
    ],
  },
  {
    version: 'v0.28.0-beta',
    date: 'Aug 2, 2026',
    headline: 'The Junkyard is on the calendar.',
    items: [
      {
        kind: 'added',
        text: 'The outdoor room on the old scrapyard lot west of the South Platte books arena-scale touring acts under an open sky. Every upcoming night now shows up in browse and search with show times and a ticket link.',
      },
    ],
  },
  {
    version: 'v0.27.1-beta',
    date: 'Aug 2, 2026',
    items: [
      {
        kind: 'fixed',
        text: 'Some Cervantes shows were printing raw web gibberish in the middle of the band name — "Daniel Donato&#8217;s Cosmic Country" instead of the apostrophe you were expecting. Fixed going forward, and the ones already listed are cleaned up.',
      },
      {
        kind: 'fixed',
        text: 'That same gibberish was hiding presale announcements from our duplicate check, so a show could turn up twice — once under the venue actually hosting it, once under the venue selling the tickets. The one that slipped through is gone, and the check now catches the rest.',
      },
    ],
  },
  {
    version: 'v0.27.0-beta',
    date: 'Aug 2, 2026',
    headline: 'Artists have their own page now — and you can follow them.',
    items: [
      {
        kind: 'added',
        text: "Tap an artist's name on any show — the headliner or anyone on the undercard — and you land on their page: every date they're playing in Denver, in order. Three nights at the same room show up as one run instead of three near-identical rows, so the page reads like a tour and not a spreadsheet. Everything they've already played sits at the bottom, so you can see whether you missed them last spring.",
      },
      {
        kind: 'added',
        text: 'Follow an artist to mark them as one of yours — their page is where their dates live. Every row on that page keeps its own Watch control, so you follow the act and still pick the one night you actually want.',
      },
      {
        kind: 'added',
        text: "If we can match them on Spotify you get a photo and a couple of tracks to jog your memory before you commit. If we can't, we say so — no invented artwork, no wrong band with a similar name.",
      },
      {
        kind: 'added',
        text: 'Search knows about artist pages now: type a name and the artists who have one come back first, above the shows.',
      },
    ],
  },
  {
    version: 'v0.26.0-beta',
    date: 'Aug 2, 2026',
    headline: 'The app can finally tell you something happened.',
    items: [
      {
        kind: 'added',
        text: "Prices drop, dates move, shows sell out — and until now you had to go looking. A small dot on your avatar means there's something new, on your phone and on desktop. Tap it and the newest couple sit right at the top of your account menu, with everything else one tap behind them. It's a DOT, not a number screaming 47 at you. Opening the list is enough to make the dot go away, and which ones you've actually dealt with is tracked separately, so nothing gets quietly buried.",
      },
      {
        kind: 'added',
        text: "Everything you get told about comes from the shows you're Watching, so the list stays short and it stays yours.",
      },
    ],
  },
  {
    version: 'v0.25.0-beta',
    date: 'Aug 2, 2026',
    headline: "The guide gets out of your way once you've been.",
    items: [
      {
        kind: 'changed',
        text: "The first-timer guide now folds itself down once a show you said you were going to at that venue has actually happened, and it stays one tap away. You've been to the room — you don't need the parking situation explained to you again. Holding a ticket to a room you've never been to still gets you the full guide.",
      },
    ],
  },
  {
    version: 'v0.24.0-beta',
    date: 'Aug 2, 2026',
    headline:
      "Never been to a venue? Now you'll know what you're walking into.",
    items: [
      {
        kind: 'added',
        text: "Venue pages now carry a first-timer guide: where to park, what the age policy actually is, whether there's a bag check, and the one thing a regular would tell you. Accessibility leads every guide — and when a venue hasn't confirmed theirs, we say so plainly instead of leaving a blank. Event pages get a small link through to the guide for the room you're headed to.",
      },
    ],
  },
  {
    version: 'v0.23.0-beta',
    date: 'Aug 2, 2026',
    headline: 'Meow Wolf Denver is on the calendar.',
    items: [
      {
        kind: 'added',
        text: 'Convergence Station books live music inside the art installation, and now those nights show up in browse and search with times and a ticket link. The electronic and experimental bookings are the draw; the burlesque and comedy nights stay off the concert calendar.',
      },
    ],
  },
  {
    version: 'v0.22.0-beta',
    date: 'Aug 2, 2026',
    headline: 'Globe Hall and Lost Lake are on the calendar.',
    items: [
      {
        kind: 'added',
        text: 'Two more of the rooms people actually go to: Globe Hall, the Globeville barbecue joint with the Americana calendar, and Lost Lake Lounge, the Colfax dive that books the punk and garage shows. Both now show up in browse and search with every upcoming night and a ticket link.',
      },
    ],
  },
  {
    version: 'v0.21.0-beta',
    date: 'Aug 1, 2026',
    headline: 'The Oriental Theater is on the calendar.',
    items: [
      {
        kind: 'added',
        text: 'The Oriental Theater — the 1927 marquee on Tennyson — now shows up in browse and search, with every upcoming night, door and show times, and a ticket link that goes straight to checkout.',
      },
    ],
  },
  {
    version: 'v0.19.0-beta',
    date: 'Jul 29, 2026',
    headline: 'Sign up mid-show and you land back on the show.',
    items: [
      {
        kind: 'added',
        text: 'Tap Watch on a show before you have an account and we hold onto it. Sign up, take the short tour, and the last button says "Back to Geese" — you land on that show already watching it, with a line explaining what happened while you were away.',
      },
      {
        kind: 'changed',
        text: 'The tour is a welcome now, not the end of an invite funnel. It lives on its own page you can re-open any time, and you can skip out of it from any step — the show you were watching is still waiting.',
      },
      {
        kind: 'changed',
        text: 'The tour also ends on a better note: picking your theme comes before the list of things we do not do yet, so the last thing you read is where to go, not what is missing.',
      },
      {
        kind: 'removed',
        text: 'No more beta pill and no more "Code accepted" on the tour. Getting in is not an event worth a badge.',
      },
    ],
  },
  {
    version: 'v0.18.0-beta',
    date: 'Jul 29, 2026',
    headline: 'The nights you actually went now have a home.',
    items: [
      {
        kind: 'added',
        text: 'History is the running list of shows you went to — artist, venue, the night, grouped by year. It is not your Watching list looking backwards: a show only lands here if you said you were going, so nothing you merely kept an eye on shows up. It is a paid feature — the page itself tells you which plan opens it.',
      },
      {
        kind: 'added',
        text: 'Watching and History are two tabs on the same page now, so you can flip between what is coming and what already happened without leaving.',
      },
      {
        kind: 'added',
        text: 'You can pull your history out as a calendar file and drop it into whatever you already use.',
      },
      {
        kind: 'added',
        text: 'In the week before a show you are watching, the row asks once whether you are still going. Say yes and it counts toward your history. Say no, or wave it off, and it never asks again.',
      },
    ],
  },
  {
    version: 'v0.17.0-beta',
    date: 'Jul 29, 2026',
    headline: "You're not the only one watching that show.",
    items: [
      {
        kind: 'added',
        text: 'Every show page now tells you who else in the crawl is watching it — by handle, right under the Watch button. Tap "see all" for the full roster. If nobody else is on it yet you get nothing at all, rather than a lonely zero.',
      },
      {
        kind: 'changed',
        text: 'The old "3 watching · alerts on price + sold out" line under the Watch button is gone. The count it carried is now the sentence beside the avatars, and the alerts promise gets its own line — so each says one thing clearly instead of sharing a tail.',
      },
    ],
  },
  {
    version: 'v0.16.2-beta',
    date: 'Jul 29, 2026',
    headline: 'The front page points at the shows, not at a beta code.',
    items: [
      {
        kind: 'changed',
        text: 'Browse shows is the first thing on the page now, and it goes straight to the calendar. Sign up sits next to it for whenever you want to keep track of something.',
      },
      {
        kind: 'added',
        text: 'The posters in the hero are links. Click the one on top and you land on that show. The line under the stack tells you how many are playing this week.',
      },
      {
        kind: 'removed',
        text: 'The "I have a code" button and the waitlist form are gone from the front page. The front door leads to the shows now, not to a gate.',
      },
    ],
  },
  {
    version: 'v0.16.1-beta',
    date: 'Jul 27, 2026',
    headline: 'The full vendor list now shows up everywhere you can pick one.',
    items: [
      {
        kind: 'fixed',
        text: 'Updating a price, or flagging one that looked off, still handed you the old six-seller list — so the twelve vendors we added on Friday were only half true. Both of those now use the same grouped picker as submitting a fresh price.',
      },
    ],
  },
  {
    version: 'v0.16.0-beta',
    date: 'Jul 25, 2026',
    headline: 'Submitting a price? The vendor list finally has your vendor.',
    items: [
      {
        kind: 'added',
        text: 'The "Where it\'s listed" question used to offer six sellers, and Etix wasn\'t one of them — despite it being the most common place Denver shows actually sell tickets. There are twelve now, including StubHub, Vivid Seats, viagogo and TicketNetwork, plus a "Somewhere else" for anything still missing.',
      },
      {
        kind: 'changed',
        text: 'The list is grouped too: face-value sellers first, resale marketplaces second, said once in plain words. Resale prices run above face value, and that should be obvious at the moment you pick — not something you piece together afterwards.',
      },
    ],
  },
  {
    version: 'v0.15.1-beta',
    date: 'Jul 25, 2026',
    headline: 'Get Tickets actually lands on the show now.',
    items: [
      {
        kind: 'fixed',
        text: "Deep-linking shipped last week, but a lot of shows were still dropping you on the venue's full calendar. Turns out the crawler was reading the calendar link itself as the ticket link and letting it win. It now recognizes that page for what it is, ignores it, and sends you to the show's own page instead.",
      },
      {
        kind: 'fixed',
        text: 'Shows we crawled before the deep-link feature existed were stuck with the old link forever. The crawler now goes back and fills those in the next time it visits the venue, so older listings catch up on their own.',
      },
    ],
  },
  {
    version: 'v0.15.0-beta',
    date: 'Jul 25, 2026',
    headline:
      'Fillmore and Marquis shows stop disappearing after the first 36.',
    items: [
      {
        kind: 'fixed',
        text: 'The Fillmore and Marquis websites only publish their first 36 shows in a form we could read, so anything further out simply never made it onto Concert Crawl — no matter how far ahead you scrolled. We now read those venues from their own monthly calendars instead, which brings their whole booked season back into the listings.',
      },
    ],
  },
  {
    version: 'v0.14.0-beta',
    date: 'Jul 20, 2026',
    headline: 'Get Tickets now drops you on the actual show page.',
    items: [
      {
        kind: 'fixed',
        text: "Some venues list a show without a direct ticket link, so Get Tickets used to dump you on the venue's full events page to hunt for the date yourself. Now, when the crawler finds the show's own page, Get Tickets deep-links straight to it — no more scrolling a wall of events to find the one you wanted.",
      },
    ],
  },
  {
    version: 'v0.13.1-beta',
    date: 'Jul 20, 2026',
    headline: 'Your taste shelf paints faster.',
    items: [
      {
        kind: 'changed',
        text: 'The "Based on your taste" shelf on Browse no longer disappears while it\'s fetching your picks — you\'ll see a shimmering placeholder that keeps the layout stable, then real cards drop in. If the fetch takes more than a beat, a Retry chip appears instead of leaving you guessing.',
      },
    ],
  },
  {
    version: 'v0.13.0-beta',
    date: 'Jul 19, 2026',
    headline: 'Watch a show, get asked once about push.',
    items: [
      {
        kind: 'added',
        text: "First time you tap Watch, we'll pop a quick sheet asking if you want a heads-up when things change — tickets drop, sell out, or the show moves. Only for shows you're watching. Say Not now and we don't ask again — Settings is always there when you change your mind.",
      },
      {
        kind: 'added',
        text: 'On iPhone: because Apple only lets web apps send notifications from Home Screen, the sheet swaps to a 3-step guide for adding Concert Crawl to your Home Screen. Takes 10 seconds — after that, push works like every other app on your phone.',
      },
    ],
  },
  {
    version: 'v0.12.0-beta',
    date: 'Jul 19, 2026',
    headline: 'Turn push on (or off) right from Settings.',
    items: [
      {
        kind: 'added',
        text: "Settings → Notifications now has a master switch and two sub-toggles (Watch updates + Price drops). One tap fires the browser permission dialog if you haven't already granted it; another tap disables push on this device without losing your preferences.",
      },
    ],
  },
  {
    version: 'v0.11.0-beta',
    date: 'Jul 19, 2026',
    headline: 'Your artists announce a Denver show — you hear about it first.',
    items: [
      {
        kind: 'added',
        text: 'New-show push alerts: when a venue posts a date from an artist you follow on Spotify, Premium members get a push the moment our crawler finds it — before it hits the calendar rush.',
      },
      {
        kind: 'added',
        text: 'Auto-watch: flip one switch and every new show from your artists lands straight on your Watching list, on every plan. Already going or watching? We never touch it.',
      },
    ],
  },
  {
    version: 'v0.10.0-beta',
    date: 'Jul 19, 2026',
    headline: 'Link Spotify and your artists light up as you browse.',
    items: [
      {
        kind: 'added',
        text: 'Connect Spotify in Settings → Connections and we pull the artists you follow and play most — read-only, unlink anytime, we never see your password.',
      },
      {
        kind: 'added',
        text: 'Shows from your artists now wear a “Following” badge as you browse, and the event page tells you exactly who on the bill you follow. No more scrolling past your own favorites.',
      },
    ],
    spotlight: {
      title: 'Your taste, on the calendar.',
      tagline: 'Link Spotify once — your artists stand out everywhere.',
      hero: 'spotify',
      cta: 'Connect Spotify',
      ctaHref: '/settings',
      steps: [
        {
          caption:
            'Head to Settings → Connections and tap Connect Spotify. You log in on Spotify’s own page — we just get a yes, plus a read-only look at your top and followed artists.',
        },
        {
          caption:
            'From then on, any Denver show featuring one of your artists gets a “Following” badge as you browse — headliners and openers both count.',
        },
        {
          caption:
            'Changed your mind? Disconnect wipes the link and the highlights on the spot. Anything you were already watching stays yours.',
        },
      ],
    },
  },
  {
    version: 'v0.9.1-beta',
    date: 'Jul 19, 2026',
    headline: 'Offline mode looks like it means it now.',
    items: [
      {
        kind: 'changed',
        text: 'The offline signal is a tiny pill in the header, not a bar across the page. Lose signal deep in the app and you land on a real page — with everything you already loaded still browsable, and honest about what needs a connection.',
      },
    ],
  },
  {
    version: 'v0.9.0-beta',
    date: 'Jul 19, 2026',
    headline: 'The install nudge grew up.',
    items: [
      {
        kind: 'changed',
        text: "Install lives in the top corner now — quiet, always there when you want it, gone when you don't. On iPhone, it walks you through the Share → Add to Home Screen tap-dance in three steps.",
      },
    ],
  },
  {
    version: 'v0.8.8-beta',
    date: 'Jul 18, 2026',
    headline: 'Wandered off into next month? One tap snaps you back to today.',
    items: [
      {
        kind: 'added',
        text: 'Once you page the calendar away from today, a small “Today” button appears next to the week arrows — tap it to jump straight back to this week with today selected. It disappears the moment today’s back in view.',
      },
    ],
  },
  {
    version: 'v0.8.7-beta',
    date: 'Jul 17, 2026',
    headline: 'Put Concert Crawl on your home screen — and take it offline.',
    items: [
      {
        kind: 'added',
        text: 'Install Concert Crawl to your home screen — Android and desktop get a one-tap install prompt, and iPhone gets a quick “Share → Add to Home Screen” nudge so it opens like a real app.',
      },
      {
        kind: 'added',
        text: 'Lose signal at the venue? Shows and venue pages you’ve already loaded stay browsable offline, with a banner up top so you know you’re looking at the last-loaded lineup.',
      },
    ],
  },
  {
    version: 'v0.8.6-beta',
    date: 'Jul 17, 2026',
    headline: 'Openers get their own line — and tours get a proper billing.',
    items: [
      {
        kind: 'changed',
        text: 'Supporting acts now read as their own line under the headliner — “with Hotline TNT · MJ Lenderman” — instead of getting mashed into one long run-on title.',
      },
      {
        kind: 'added',
        text: 'Tour names ride above the headliner as a kicker, so “Rat Saw God Tour” shows up as the tour it is, not buried in the show name.',
      },
      {
        kind: 'changed',
        text: 'Long opener lineups on a card trim to a clean “+3 more,” while the full roster still reads aloud in order for screen readers.',
      },
    ],
  },
  {
    version: 'v0.8.5-beta',
    date: 'Jul 16, 2026',
    headline:
      'Jump straight to any date on the calendar — no more clicking through weeks.',
    items: [
      {
        kind: 'added',
        text: 'Tap the month above the day strip to pop open a mini calendar and jump to any date in one move — a weekend three months out is now one tap, not a dozen.',
      },
      {
        kind: 'added',
        text: 'Dots on the mini calendar show which days already have shows on sale, so you can spot a busy night before you even pick it.',
      },
    ],
  },
  {
    version: 'v0.8.4-beta',
    date: 'Jul 12, 2026',
    headline: 'Every price tier you submit sticks around — and stays clear.',
    items: [
      {
        kind: 'fixed',
        text: 'Submit three or more tiers at once and they all stay put on reload — the third one no longer vanishes when the page refreshes.',
      },
      {
        kind: 'fixed',
        text: 'A “submit another price” card now sits under your pending submissions for good, so you can add a tier any time — not just in the seconds right after you submit.',
      },
      {
        kind: 'fixed',
        text: 'Shows coming up fast now wear a “Days away” tag — tap it to see why they need an extra confirmation before a price goes live.',
      },
    ],
  },
  {
    version: 'v0.8.3-beta',
    date: 'Jul 11, 2026',
    headline:
      'Change your plan, cancel, or come back — all without leaving Settings.',
    items: [
      {
        kind: 'added',
        text: 'Manage subscription grew up — one sheet now handles changing plans, updating your card, and cancelling, with a clear read on what happens and when.',
      },
      {
        kind: 'added',
        text: 'Switching tiers shows the real math before you commit — upgrades bill the prorated difference today, downgrades bank the credit toward next month.',
      },
      {
        kind: 'added',
        text: 'Cancelled but changed your mind? Resubscribe with one tap any time before your paid days run out — no new checkout, nothing lost.',
      },
    ],
  },
  {
    version: 'v0.8.2-beta',
    date: 'Jul 11, 2026',
    headline: 'Trials end. We’ll say so — once — and get out of the way.',
    items: [
      {
        kind: 'added',
        text: 'Day-13 heads-up — a thin banner on your last trial day, in case you want to lock Premium in before it lapses. One tap dismisses it for good.',
      },
      {
        kind: 'added',
        text: 'When the trial wraps, your next visit gets a single pick-a-lane screen with the full plan lineup. Choose one or keep browsing on Free — we won’t show it twice.',
      },
    ],
  },
  {
    version: 'v0.8.1-beta',
    date: 'Jul 11, 2026',
    headline: 'Settings finally tells you what plan you’re on. In detail.',
    items: [
      {
        kind: 'changed',
        text: 'The plan card in Settings got a full redesign — it now knows exactly where you stand: active plan, trial countdown, winding-down after a cancel, even a payment-failed heads-up with a one-tap card fix.',
      },
      {
        kind: 'added',
        text: 'Manage subscription — paid plans get a button that drops you straight into billing management (update card, cancel, the works).',
      },
    ],
  },
  {
    version: 'v0.8.0-beta',
    date: 'Jul 11, 2026',
    headline: 'Plans exist now. Beta folks: yours is already paid for.',
    items: [
      {
        kind: 'added',
        text: 'Compare plans — a new tier picker in Settings lays out Free, Supporter, Premium, and the 100-seat Founder deal side by side. Whatever you pay, you pay; we won’t raise it on you.',
      },
      {
        kind: 'added',
        text: 'Checkout happens right in the picker — card form and all, no redirect to a Stripe-branded page and back.',
      },
      {
        kind: 'added',
        text: 'Beta members get lifetime Premium on us. Open the picker and it says as much — nothing to buy, nothing to cancel.',
      },
    ],
  },
  {
    version: 'v0.7.0-beta',
    date: 'Jul 10, 2026',
    headline: 'Standing at the box office? Submit every tier you can see.',
    items: [
      {
        kind: 'added',
        text: 'Multi-tier price submission — hit "Add another tier" in the submit form to send GA, VIP, and friends in one go. Each tier still gets its own trust mark and its own fan confirmations.',
      },
    ],
  },
  {
    version: 'v0.6.1-beta',
    date: 'Jun 26, 2026',
    headline: 'The site got faster — landing page and sign-in both.',
    items: [
      {
        kind: 'changed',
        text: 'Denver landing page now serves a cached snapshot that refreshes every five minutes — first paint is near-instant, even on a cold visit.',
      },
      {
        kind: 'changed',
        text: 'Sign-in redirects now happen at the edge instead of bouncing through a server function. Cold-start protected pages should feel noticeably snappier when you (or anyone) lands on one without being signed in.',
      },
    ],
  },
  {
    version: 'v0.6.0-beta',
    date: 'Jun 24, 2026',
    headline: "Resale isn't face value — and now we make that obvious.",
    items: [
      {
        kind: 'changed',
        text: "Sold-out and resale-only events now spell out what resale actually means. No more guessing whether that $180 'price' is the box office or a markup.",
      },
      {
        kind: 'added',
        text: 'Multi-tier breakdowns on event pages — GA, Reserved, and VIP each get their own row instead of collapsing into a single number.',
      },
      {
        kind: 'added',
        text: 'Browse cards flag resale-only events with a coral tag, so you can spot the markups before you tap in.',
      },
      {
        kind: 'changed',
        text: "Submit-a-price form now leads with where the price came from (box office, resale, the venue's site) instead of how you found it.",
      },
      {
        kind: 'fixed',
        text: "When two fans disagree on a price, the contest button points you to the live counter instead of letting you start a second one you'd lose.",
      },
    ],
  },
  {
    version: 'v0.5.0-beta',
    date: 'May 8, 2026',
    headline:
      'Community Pricing is here. Grass roots price transparency, baby.',
    spotlight: {
      title: 'Submit a price. Help the next fan.',
      tagline: 'Community-sourced ticket prices, right on the event page.',
      hero: 'price',
      cta: 'Try it on an event',
      ctaHref: '/events',
      steps: [
        {
          caption:
            "Open any event. If we don't have a price yet, you can visit the ticket link and submit what you saw/paid.",
        },
        {
          caption:
            'We give each price a trust mark. This shows you if it’s from the box office, resale, or community-verified. For a community price to get the verified trust mark, two other fans need to confirm that it’s accurate.',
        },
        {
          caption:
            'As much as we want to keep prices up to date, they do go stale with price fluctuations. We expire prices after a week, and we’ll show you when a price is old. You can submit a new price to keep things fresh.',
        },
      ],
      founderNote: [
        `So, this feature was born partly out of frustration and partly out of wanting to build a community. The big ticket vendors hide pricing and there’s almost no way for me to access it in a "good" way. But, even so, price transparency was something I really wanted for the app. Plenty of apps will tell you who is coming and when, but you always have to dig into the vendor's website to see the price.`,
        `With Community Pricing, we try to get around that by having users do a little bit of legwork. Hell, I even try to add some prices myself when I can. And, the big idea we have with Community Pricing is driving concert goers to the box office. Sure, you have to drive/walk to the venue, but you cut out the corporate middlemen, skip the fees, and maybe get to know Joe-schmoe down at The Ogden.`,
        `Down with the fees, up with the vibes. Grass roots concert revolution, baby!`,
      ],
      founderSign: '— Hugh',
    },
    items: [
      {
        kind: 'added',
        text: 'Price submission — tap any event to submit what you paid. Helps everyone who comes after.',
      },
      {
        kind: 'added',
        text: 'Trust marks on prices — venue-official, resale platform, or community-submitted.',
      },
      {
        kind: 'added',
        text: 'Price expiry — submitted prices auto-expire after 7 days. No stale data.',
      },
      {
        kind: 'fixed',
        text: 'Watching list no longer flashes empty on cold start.',
      },
      { kind: 'fixed', text: 'Filter chips stay readable in light theme.' },
    ],
  },
  {
    version: 'v0.4.1-beta',
    date: 'Apr 24, 2026',
    headline: null,
    items: [
      {
        kind: 'added',
        text: 'Identity art for artists and venues — generative, deterministic, never the same twice.',
      },
      {
        kind: 'fixed',
        text: "Empty calendar view no longer shows yesterday's shows for a frame.",
      },
      {
        kind: 'changed',
        text: 'Filter sheet remembers your last selection within a session.',
      },
    ],
  },
  {
    version: 'v0.4.0-beta',
    date: 'Apr 15, 2026',
    headline: 'First build you can actually use end-to-end.',
    items: [
      {
        kind: 'added',
        text: 'Browse page with date picker, price filter, and venue filter.',
      },
      {
        kind: 'added',
        text: 'Event detail page with venue map and show times.',
      },
      { kind: 'added', text: 'Watching list — save shows you care about.' },
      { kind: 'added', text: 'Search across events and venues.' },
    ],
  },
]
