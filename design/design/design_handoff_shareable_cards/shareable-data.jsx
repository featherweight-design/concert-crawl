// shareable-data.jsx — fixture events + user + mint metadata.
// Mint metadata is the "minted artifact" envelope: serial number, who, when,
// and a content hash that ties the visual to its inputs. The same inputs render
// the same image; resharing the same combo returns the same serial.

const SHARE_USER = {
  id:     "u_8821",
  name:   "Mira",
  handle: "@mira",
};

const SHARE_EVENTS = {
  callboy: {
    id:        "evt_callboy_2026_05_18",
    artist:    "Sextile",
    venue:     "The Echo",
    venueShort:"The Echo",
    city:      "Los Angeles, CA",
    date:      "Sat May 18",
    dateShort: "MAY 18",
    dateLong:  "Saturday · May 18, 2026",
    doors:     "8:00pm",
    showTime:  "9:00pm",
    ages:      "18+",
    genres:    ["Post-punk", "Electronic"],
    state:     "going",
    pricePill: "$22",
    snark:     "found this one on Concert Crawl. see you in the pit.",
  },
  geese: {
    id:        "evt_geese_2026_06_02",
    artist:    "Geese",
    venue:     "Bowery Ballroom",
    venueShort:"Bowery",
    city:      "New York, NY",
    date:      "Tue Jun 2",
    dateShort: "JUN 02",
    dateLong:  "Tuesday · June 2, 2026",
    doors:     "7:30pm",
    showTime:  "8:30pm",
    ages:      "16+",
    genres:    ["Indie rock"],
    state:     "soldout",
    pricePill: "Sold out",
    snark:     "you snoozed. now you're refreshing stubhub at 2am like the rest of us.",
  },
  amyl: {
    id:        "evt_amyl_2026_06_14",
    artist:    "Amyl and the Sniffers",
    venue:     "Brooklyn Steel",
    venueShort:"Bk Steel",
    city:      "Brooklyn, NY",
    date:      "Sat Jun 14",
    dateShort: "JUN 14",
    dateLong:  "Saturday · June 14, 2026",
    doors:     "7:00pm",
    showTime:  "8:00pm",
    ages:      "All ages",
    genres:    ["Punk"],
    state:     "drop",
    pricePill: "↓ $34",
    snark:     "price dropped $9. so did my dignity, but that's unrelated.",
  },
};

// Faux content hash from a few stable inputs. Production would hash the
// rendered PNG bytes; this is a stand-in for the look.
function _hashStr(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

function mintMeta(event, user, serial) {
  const contentHash = _hashStr(`${event.id}:${user.id}:${event.state}`);
  return {
    serial:           String(serial).padStart(4, "0"),
    by:               user.handle,
    mintedAt:         "2026-05-09T17:42:00Z",
    mintedAtShort:    "May 9, 5:42pm",
    contentHash:      contentHash.toUpperCase(),
  };
}

window.SHARE_USER = SHARE_USER;
window.SHARE_EVENTS = SHARE_EVENTS;
window.mintMeta = mintMeta;
