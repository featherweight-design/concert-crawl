// bot-page.jsx — /bot, the public crawler transparency page.
// Audience: a venue's technical staff who found ConcertCrawl/1.0 in a log and
// followed the URL. No nav, no auth, no theme picker. Light by default.
// All copy declared as data in BOT_COPY.

const { BotLockup, MonoTag, BotSectionHead, FactGroup, FactRow, CopyBlock, ContactCard } = window;
const BP_MONO = window.BOT_MONO;
const BP_SANS = window.BOT_SANS;

const BOT_UA = "ConcertCrawl/1.0 (+https://concertcrawl.app/bot)";

const BOT_ROBOTS = [
  "User-agent: ConcertCrawl",
  "Disallow: /",
];

const BOT_COPY = {
  eyebrow: "CRAWLER INFO · /BOT",
  h1: "This is our crawler.",
  lede: "If you're here, ConcertCrawl/1.0 turned up in your server logs and you followed the URL it left. Good — that's what it's for.",
  who: "Concert Crawl is a Denver concert listing site. We read public event pages so someone deciding what to see this week can find every show in town in one place, with what a ticket actually costs. When we list your show, the ticket link points at you.",
  whoLink: { label: "See what we're building", href: "https://concertcrawl.app" },
  promise: "Everything our crawler does is on this page, including how to make it stop.",

  sections: {
    identity: {
      n: "01",
      title: "How to recognize us",
      note: "Every request we make carries this string. Nothing we run identifies itself any other way — if you see a different agent claiming to be us, it isn't.",
    },
    robots: {
      n: "02",
      title: "robots.txt",
      note: "We read it before we read anything else.",
    },
    rate: {
      n: "03",
      title: "Rate and schedule",
      note: "We're a small crawler on a slow clock. If we're still costing you more than you want to spend, section 5 is a two-line fix.",
    },
    data: {
      n: "04",
      title: "What we take, and what we don't",
    },
    stop: {
      n: "05",
      title: "Making us stop",
      note: "Two ways. The first needs nothing from us.",
    },
  },

  facts: {
    ua: "User-Agent",
    javascript: {
      label: "JavaScript",
      value: "We don't run it. Plain HTTP GET, HTML parsed as text — no headless browser, no clicks, no form submissions, no logins.",
    },
    disallow: {
      label: "Disallow",
      value: "We request robots.txt before crawling and obey any Disallow that applies to us. If it's unreachable, we proceed at our normal rate.",
    },
    recheck: {
      label: "Re-check",
      value: "At the start of every pass — so at least once a day. An edit you make this afternoon is in force by tonight's run.",
    },
    crawlDelay: {
      label: "Crawl-delay",
      value: "Honored. Where you state one, we take the longer of your value and our own 3-second default — we never speed up because a site permits it.",
    },
    rate: {
      label: "Request rate",
      value: "One request every 3 seconds to the same domain, plus a random jitter so we never arrive on a fixed beat. Never parallel against one host.",
    },
    perVenue: {
      label: "Per venue",
      value: "That interval is configurable per site. If 3 seconds is still too fast for your box office, name a number and we'll set it for you.",
    },
    fullPass: {
      label: "Full pass",
      value: "Once a day, 3:00 AM Mountain time.",
    },
    triggers: {
      label: "Trigger checks",
      value: "Every 10 minutes we make a lightweight check for signs a page has changed. Nothing is re-read unless something did.",
    },
    weRead: {
      label: "We read",
      value: "Public event pages only: show name, performing artists, date and time, ticket price, on-sale status, and the link back to your own ticketing page.",
    },
    weNever: {
      label: "We never",
      value: "Touch anything behind a login, submit a form, follow a checkout, or collect anything about a person — no customer data, no email addresses, no accounts. We don't have a login to your site and don't want one.",
    },
    yourPage: {
      label: "Your page",
      value: "Everything we hold about your venue is visible on one page, in public:",
      link: { label: "concertcrawl.app/venues/your-venue", href: "https://concertcrawl.app/venues" },
      note: "Venue pages are invite-only during our private beta and open to everyone at launch.",
    },
  },

  stop: {
    robotsTitle: "Add us to robots.txt",
    robotsNote: "In force by the next pass — within 24 hours, and usually sooner.",
    orTitle: "Or tell a person",
    contactBody: "A human reads this address, not a queue. Say the word and we'll stop crawling you — we answer within two business days.",
    removalTitle: "Removing what we already have",
    removalBody: "Blocking the crawler stops new reads; it doesn't unpublish what we've already collected. Ask for removal in the same email and we'll take your venue's listings and price history down within 30 days, and write back when it's done. No account, no form, no conditions.",
    closing: "We'd rather be the link that sends someone to your box office than a line you have to block.",
  },

  footer: {
    updated: "LAST UPDATED · AUG 2026",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Beta terms", href: "/legal/beta" },
    ],
  },

  contactEmail: "venues@concertcrawl.app",
};

// ── The page ───────────────────────────────────────────────────
// One column, max 720. `w` drives the single breakpoint: at 560+ fact rows go
// two-column and the type steps up. Nothing else changes.
function BotPage({ w = 393, insetTop = 0, insetBottom = 0 }) {
  const wide = w >= 560;
  const pad = wide ? 40 : 20;
  const C = BOT_COPY;
  const F = C.facts;

  const link = {
    color: "var(--signal)", textDecoration: "none",
    borderBottom: "1px solid color-mix(in oklch, var(--signal) 45%, transparent)",
    fontWeight: 600,
  };

  const Section = ({ s, children }) => (
    <section style={{ display: "flex", flexDirection: "column" }}>
      <BotSectionHead n={s.n} title={s.title} note={s.note} />
      {children}
    </section>
  );

  return (
    <div style={{
      background: "var(--bg)", minHeight: "100%", width: "100%",
      fontFamily: BP_SANS, color: "var(--fg)",
    }}>
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: `${(wide ? 22 : 16) + insetTop}px ${pad}px ${wide ? 22 : 16}px`,
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}><BotLockup /></div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: `${wide ? 44 : 28}px ${pad}px ${wide ? 56 : 40}px` }}>

        {/* Intro — the branded half. Short: three paragraphs, then the spec. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: wide ? 44 : 34 }}>
          <MonoTag>{C.eyebrow}</MonoTag>
          <h1 style={{
            margin: 0, fontFamily: BP_SANS, fontWeight: 900,
            fontSize: wide ? 44 : 31, lineHeight: 1.06, letterSpacing: "-0.035em",
            color: "var(--fg)",
          }}>{C.h1}</h1>
          <p style={{
            margin: 0, fontSize: wide ? 17.5 : 16, lineHeight: 1.6, fontWeight: 500,
            color: "var(--fg)", textWrap: "pretty",
          }}>{C.lede}</p>
          <p style={{
            margin: 0, fontSize: wide ? 16 : 15, lineHeight: 1.65, fontWeight: 500,
            color: "var(--fg-muted)", textWrap: "pretty",
          }}>{C.who} <a href={C.whoLink.href} style={link}>{C.whoLink.label}</a>.</p>
          <p style={{
            margin: 0, fontSize: wide ? 16 : 15, lineHeight: 1.65, fontWeight: 600,
            color: "var(--fg)", textWrap: "pretty",
          }}>{C.promise}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: wide ? 40 : 32 }}>

          <Section s={C.sections.identity}>
            <FactGroup>
              <FactRow label={F.ua} wide={wide} first>
                <div style={{ marginTop: -2 }}><CopyBlock text={BOT_UA} /></div>
              </FactRow>
              <FactRow label={F.javascript.label} wide={wide}>{F.javascript.value}</FactRow>
            </FactGroup>
          </Section>

          <Section s={C.sections.robots}>
            <FactGroup>
              <FactRow label={F.disallow.label} wide={wide} first>{F.disallow.value}</FactRow>
              <FactRow label={F.recheck.label} wide={wide}>{F.recheck.value}</FactRow>
              <FactRow label={F.crawlDelay.label} wide={wide}>{F.crawlDelay.value}</FactRow>
            </FactGroup>
          </Section>

          <Section s={C.sections.rate}>
            <FactGroup>
              <FactRow label={F.rate.label} wide={wide} first>{F.rate.value}</FactRow>
              <FactRow label={F.perVenue.label} wide={wide}>{F.perVenue.value}</FactRow>
              <FactRow label={F.fullPass.label} wide={wide}>{F.fullPass.value}</FactRow>
              <FactRow label={F.triggers.label} wide={wide}>{F.triggers.value}</FactRow>
            </FactGroup>
          </Section>

          <Section s={C.sections.data}>
            <FactGroup>
              <FactRow label={F.weRead.label} wide={wide} first>{F.weRead.value}</FactRow>
              <FactRow label={F.weNever.label} wide={wide}>{F.weNever.value}</FactRow>
              <FactRow label={F.yourPage.label} wide={wide}>
                {F.yourPage.value}{" "}
                <a href={F.yourPage.link.href} style={{ ...link, fontFamily: BP_MONO, fontSize: 13.5, wordBreak: "break-all" }}>{F.yourPage.link.label}</a>
                <div style={{
                  marginTop: 8, fontFamily: BP_MONO, fontSize: 11, lineHeight: 1.5,
                  fontWeight: 500, color: "var(--fg-muted)",
                }}>{F.yourPage.note}</div>
              </FactRow>
            </FactGroup>
          </Section>

          <Section s={C.sections.stop}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 style={{
                  margin: 0, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em",
                  color: "var(--fg)",
                }}>{C.stop.robotsTitle}</h3>
                <CopyBlock lines={BOT_ROBOTS} />
                <div style={{
                  fontFamily: BP_MONO, fontSize: 11, fontWeight: 500,
                  letterSpacing: "0.03em", color: "var(--fg-muted)",
                }}>{C.stop.robotsNote}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 style={{
                  margin: 0, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em",
                  color: "var(--fg)",
                }}>{C.stop.orTitle}</h3>
                <ContactCard email={C.contactEmail} wide={wide}>{C.stop.contactBody}</ContactCard>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 style={{
                  margin: 0, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em",
                  color: "var(--fg)",
                }}>{C.stop.removalTitle}</h3>
                <p style={{
                  margin: 0, fontSize: 14.5, lineHeight: 1.6, fontWeight: 500,
                  color: "var(--fg-muted)", textWrap: "pretty",
                }}>{C.stop.removalBody}</p>
              </div>
            </div>
          </Section>

          <p style={{
            margin: 0, paddingTop: wide ? 8 : 4,
            fontSize: wide ? 17 : 15.5, lineHeight: 1.55, fontWeight: 600,
            letterSpacing: "-0.01em", color: "var(--fg)", textWrap: "pretty",
            maxWidth: "44ch",
          }}>{C.stop.closing}</p>
        </div>
      </main>

      <footer style={{
        borderTop: "1px solid var(--border)", padding: `18px ${pad}px ${28 + insetBottom}px`,
      }}>
        <div style={{
          maxWidth: 720, margin: "0 auto", display: "flex", flexWrap: "wrap",
          gap: "10px 18px", alignItems: "center",
          justifyContent: wide ? "space-between" : "flex-start",
        }}>
          <MonoTag>{C.footer.updated}</MonoTag>
          <nav style={{ display: "flex", gap: 16 }}>
            {C.footer.links.map(l => (
              <a key={l.label} href={l.href} style={{
                fontFamily: BP_MONO, fontSize: 11, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: "var(--fg-muted)", textDecoration: "none",
              }}>{l.label}</a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { BotPage, BOT_COPY, BOT_UA, BOT_ROBOTS });
