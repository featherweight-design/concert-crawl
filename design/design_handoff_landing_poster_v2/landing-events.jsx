// landing-events.jsx — hand-picked fixtures for the landing-page poster animation.
//
// Curated for visual rhythm: mixed artist-name lengths (1 / 2 / 3+ words), mixed
// states (tonight / soon / sold-out / price-drop), and mixed IdentityArt
// palettes (the artist names below were chosen so identityFor() picks a varied
// spread across the four artist templates × eight palettes).
//
// Used by the LandingPoster animation. Not shipped to production — production
// pulls live event data and the same poster renders against it.

const LP_EVENTS = [
  {
    id:        "lp_evt_geese",
    artist:    "Geese",
    venue:     "Larimer Lounge",
    city:      "Denver, CO",
    date:      "2026-05-23",          // Tonight (matches our fixture "today")
    dateShort: "MAY 23",
    dateLong:  "Saturday · May 23",
    showTime:  "9:00pm",
    doors:     "8:00pm",
    opener:    "Mary in the Junkyard",
    state:     "tonight",             // surfaces TONIGHT eyebrow
  },
  {
    id:        "lp_evt_wednesday",
    artist:    "Wednesday",
    venue:     "Bluebird Theater",
    city:      "Denver, CO",
    date:      "2026-05-24",
    dateShort: "MAY 24",
    dateLong:  "Sunday · May 24",
    showTime:  "8:30pm",
    doors:     "7:30pm",
    opener:    "Truth Club",
    state:     "going",
  },
  {
    id:        "lp_evt_amyl",
    artist:    "Amyl and the Sniffers",
    venue:     "Ogden Theatre",
    city:      "Denver, CO",
    date:      "2026-05-27",
    dateShort: "MAY 27",
    dateLong:  "Wednesday · May 27",
    showTime:  "8:00pm",
    doors:     "7:00pm",
    opener:    "C.O.F.F.I.N.",
    state:     "soldout",
  },
  {
    id:        "lp_evt_mannequin",
    artist:    "Mannequin Pussy",
    venue:     "Gothic Theatre",
    city:      "Englewood, CO",
    date:      "2026-05-30",
    dateShort: "MAY 30",
    dateLong:  "Saturday · May 30",
    showTime:  "9:00pm",
    doors:     "8:00pm",
    opener:    "Soul Glo",
    state:     "drop",
    pricePill: "↓ $9",
  },
  {
    id:        "lp_evt_bigthief",
    artist:    "Big Thief",
    venue:     "Mission Ballroom",
    city:      "Denver, CO",
    date:      "2026-06-04",
    dateShort: "JUN 04",
    dateLong:  "Thursday · June 4",
    showTime:  "8:00pm",
    doors:     "7:00pm",
    opener:    "Buck Meek",
    state:     "going",
  },
  {
    id:        "lp_evt_sextile",
    artist:    "Sextile",
    venue:     "Hi-Dive",
    city:      "Denver, CO",
    date:      "2026-06-07",
    dateShort: "JUN 07",
    dateLong:  "Sunday · June 7",
    showTime:  "9:00pm",
    doors:     "8:00pm",
    opener:    null,
    state:     "going",
  },
];

// State pill copy + accent token mapping. The TONIGHT pill is what gives the
// landing animation its urgency hook — surfaced when state === "tonight" or
// when the event date matches "today" in a real impl.
const LP_STATE_PILLS = {
  tonight: { label: "TONIGHT",   tone: "hot"   },
  going:   { label: "GOING",     tone: "live"  },
  soldout: { label: "SOLD OUT",  tone: "warn"  },
  drop:    { label: "PRICE DROP",tone: "good"  },
};

window.LP_EVENTS = LP_EVENTS;
window.LP_STATE_PILLS = LP_STATE_PILLS;
