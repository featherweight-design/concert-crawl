// empty-state-content.jsx — copy registry + the canvas itself.
//
// The registry is a single source of truth for every (surface, state) pair
// we cover. Each direction renders the same content so we can compare
// directions apples-to-apples on the canvas.

const ES_CONTENT = {
  // ── Browse / calendar ──────────────────────────────────────────────
  "browse.no-data": {
    eyebrow: "Tonight",
    icon: "calendar",
    quiet:      { title: "No shows tonight.",        body: "Wednesdays are quiet. Try the rest of the week — Friday and Saturday usually fill out." },
    suggestive: { title: "No shows tonight.",        body: "Slow night. Here's where the rest of the week is heading." },
    voice:      { title: "No shows tonight, grandpa.", body: "Wednesdays are slow. The weekend's already loading up — Fri/Sat are stacked." },
    hybrid:     { title: "No shows tonight, grandpa.", body: "Wednesdays are slow. The weekend's already loading up — Fri/Sat are stacked." },
  },
  "browse.filtered": {
    eyebrow: "Filtered",
    icon: "calendar",
    quiet:      { title: "No shows match.",         body: "Nothing in this date range hits all your filters. Try widening the date or dropping a filter." },
    suggestive: { title: "Nothing matches.",        body: "Filters are doing their job — maybe too well. Loosen one or jump to a wider window." },
    voice:      { title: "Crickets.",               body: "These filters are airtight. Drop one, or stretch the dates a few days either side and try again." },
    hybrid:     { title: "Crickets.",               body: "These filters are airtight. Drop one, or stretch the dates a few days either side and try again." },
  },

  // ── Search ─────────────────────────────────────────────────────────
  "search.no-data": {
    eyebrow: "Search",
    icon: "search",
    quiet:      { title: "Search for an artist or venue.", body: "Type an artist, venue or city to find shows. Recent searches show up here once you start." },
    suggestive: { title: "What are you looking for?",      body: "Try an artist, a venue, or a neighborhood. Or jump into one of these." },
    voice:      { title: "Type something.",                body: "Artist. Venue. Neighborhood. Doesn't have to be a full name — we'll meet you halfway." },
    hybrid:     { title: "Type something.",                body: "Artist. Venue. Neighborhood. Doesn't have to be a full name — we'll meet you halfway." },
  },
  "search.filtered": {
    eyebrow: "No results",
    icon: "search",
    quiet:      { title: "No results for \u201Cthee oh sees\u201D.", body: "Nothing on the calendar under that name right now. Watch the artist and we'll ping you when something gets posted." },
    suggestive: { title: "No hits for \u201Cthee oh sees\u201D.",   body: "Nothing booked yet. Watch the artist or try a related search below." },
    voice:      { title: "Nothing under that name.",                body: "No bookings for \u201Cthee oh sees\u201D right now. Save the artist — we'll holler when one drops." },
    hybrid:     { title: "Nothing under that name.",                body: "No bookings for \u201Cthee oh sees\u201D right now. Save the artist — we'll holler when one drops." },
  },

  // ── Watching ───────────────────────────────────────────────────────
  "watching.no-data": {
    eyebrow: "Watching",
    icon: "bookmark",
    quiet:      { title: "Nothing watched yet.",   body: "Tap the bookmark on a show to keep an eye on its price. We'll tell you when it drops, spikes, or sells out." },
    suggestive: { title: "Nothing watched yet.",   body: "Bookmark a show to track its price. Want a head start? Here are the ones moving most this week." },
    voice:      { title: "Empty queue.",           body: "Bookmark a show and we'll watch its price for you — drops, spikes, sell-outs. We're patient." },
    hybrid:     { title: "Empty queue.",           body: "Bookmark a show and we'll watch its price for you — drops, spikes, sell-outs. We're patient." },
  },

  // ── Generic / error ────────────────────────────────────────────────
  "generic.error": {
    eyebrow: "Failed to load",
    icon: "bolt",
    quiet:      { title: "Couldn't load this.",  body: "Something hiccuped on our end. Give it another shot — it usually comes back." },
    suggestive: { title: "Couldn't load this.",  body: "Hiccup on our end. Retry, or jump somewhere else for a sec." },
    voice:      { title: "Signal lost.",         body: "Our end choked on the request. Try again — it almost always works the second time." },
    hybrid:     { title: "Signal lost.",         body: "Our end choked on the request. Try again — it almost always works the second time." },
  },
  "generic.offline": {
    eyebrow: "Offline",
    icon: "wifi",
    quiet:      { title: "No connection.",       body: "You're offline. Reconnect and we'll pull this in." },
    suggestive: { title: "You're offline.",      body: "Reconnect to load this — your saved shows are still here in the meantime." },
    voice:      { title: "No signal.",           body: "Wherever you are, the wifi isn't. Pop back on and this'll fill in." },
    hybrid:     { title: "No signal.",           body: "Wherever you are, the wifi isn't. Pop back on and this'll fill in." },
  },
};

// Suggestion sets per surface — only used by the "suggestive" direction.
const ES_SUGGESTIONS = {
  "browse.no-data":   ["This weekend", "Free shows", "Within 5 mi"],
  "browse.filtered":  ["+/- 3 days", "Drop venue", "Drop genre"],
  "search.no-data":   ["fontaines d.c.", "Black Cat", "Jade Bird"],
  "search.filtered":  ["Artist + city", "Browse by venue"],
  "watching.no-data": ["Tonight", "This weekend", "Under $30"],
  "generic.error":    ["Retry", "Go to Browse"],
  "generic.offline":  [],
};

// CTA buttons per (surface, state). Keyed so all three directions render
// the same buttons; only the layout/voice changes. `secondary` is shown
// only on filtered / error states (clear-filter / retry).
const ES_CTAS = {
  "browse.no-data":   { primary: "View this week",     secondary: null },
  "browse.filtered":  { primary: "Widen date range",   secondary: "Clear filters" },
  "search.no-data":   { primary: null,                 secondary: null },
  "search.filtered":  { primary: "Watch this artist",  secondary: "Clear search" },
  "watching.no-data": { primary: "Browse tonight",     secondary: null },
  "generic.error":    { primary: "Try again",          secondary: "Go to Browse" },
  "generic.offline":  { primary: "Retry",              secondary: null },
};

window.ES_CONTENT = ES_CONTENT;
window.ES_SUGGESTIONS = ES_SUGGESTIONS;
window.ES_CTAS = ES_CTAS;
