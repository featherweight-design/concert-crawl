"""Review page for the invite poster: poster variants, why it scans, the admin screen, and what changes in code."""
import os
from build import *  # noqa

OUT = os.path.join(HERE, 'invite-poster.html')


def board(inner, w, h, caption, note=''):
    return (f'<figure class="bd"><div class="bd-fit" data-w="{w}" data-h="{h}" style="aspect-ratio:{w}/{h}"><div class="bd-in" style="width:{w}px;height:{h}px">{inner}</div></div>'
            f'<figcaption><b>{caption}</b>{f"<span>{note}</span>" if note else ""}</figcaption></figure>')


SCAN_ROWS = [
    ('Today (PR #79)', 'auth/code?code=…, mixed case', 'v4 · M', '3.75 in', '2', '6 ft: 4 of 8', '8 ft: 0 of 8'),
    ('Proposed', 'CONCERTCRAWL.APP/I/BETA-…, all caps', 'v3 · Q', '4.5 in', '4', '6 ft: 8 of 8', '8 ft: 7 of 8'),
    ('Proposed, tear-off tabs', 'same', 'v3 · Q', '3.5 in', '4', '6 ft: 8 of 8', '8 ft: 3 of 8'),
]


def scan_table():
    head = ''.join(f'<th>{h}</th>' for h in ['', 'What the QR holds', 'Size · error fix', 'Printed', 'Quiet zone (modules)', 'Dim light', 'Farther'])
    rows = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in SCAN_ROWS)
    return f'<div class="tbl"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>'


HTML = f'''<title>Invite poster</title>
<meta name="claude:viewport-fit-sides" content="cover">
{FONTS}
<style>
/* Layout: a review page in the app's own Electric dark. Posters and screens sit on boards that scale to the column. */
:root{{--bg:#070A1A;--el:#0E1226;--s1:#11162E;--fg:#E8F3FF;--muted:#9AA8C7;--subtle:#5A6788;--border:#1F2748;--signal:#7AE6FF;--accent:#FF7BD4;
  --display:Inter,system-ui,sans-serif;--mono:'JetBrains Mono',ui-monospace,monospace;color-scheme:dark}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--fg);font-family:var(--display);font-size:15px;line-height:1.55;
  background-image:radial-gradient(1100px 650px at 0% 0%,rgba(198,124,234,.12),transparent 65%)}}
.wrap{{max-width:1180px;margin:0 auto;padding-block:40px 80px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
header.top{{display:flex;flex-direction:column;gap:14px;max-width:760px}}
.eyebrow{{font:600 11px/1 var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--signal)}}
h1.t{{margin:0;font-size:clamp(32px,5vw,48px);font-weight:900;letter-spacing:-0.03em;line-height:1.02;text-wrap:balance}}
.lead{{margin:0;font-size:17px;color:var(--muted);max-width:66ch}}
nav.toc{{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}}
nav.toc a{{font:500 12px/1 var(--mono);color:var(--fg);text-decoration:none;border:1px solid var(--border);border-radius:999px;padding:8px 12px}}
nav.toc a:hover,nav.toc a:focus-visible{{border-color:var(--signal);outline:none}}
section.s{{margin-top:64px;display:flex;flex-direction:column;gap:18px}}
section.s>h2{{margin:0;font-size:26px;font-weight:800;letter-spacing:-0.02em}}
section.s>p,.cols p{{margin:0;color:var(--muted);max-width:70ch}}
section.s>p b,.card b,ol.list b{{color:var(--fg)}}
.g3{{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:22px;align-items:start}}
.g2{{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start}}
.gm{{display:grid;grid-template-columns:repeat(2,minmax(0,330px));gap:28px;justify-content:start}}
.bd{{margin:0;min-width:0;display:flex;flex-direction:column;gap:10px}}
.bd-fit{{position:relative;width:100%;max-width:100%;overflow:hidden;border-radius:6px;background:#1a1d2c}}
.bd-in{{position:absolute;left:0;top:0;transform-origin:top left}}
.bd figcaption{{display:flex;flex-direction:column;gap:3px;font-size:13.5px;color:var(--muted)}}
.bd figcaption b{{color:var(--fg);font-size:14px}}
.mat-p{{background:#2a2622}}
.cols{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}}
.card{{border:1px solid var(--border);background:var(--el);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;min-width:0}}
.card h3{{margin:0;font-size:15px;font-weight:700}}
.card p{{font-size:14px}}
.tbl{{overflow-x:auto;border:1px solid var(--border);border-radius:12px}}
table{{border-collapse:collapse;width:100%;min-width:760px;font-size:13.5px}}
th,td{{text-align:left;padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:top}}
th{{font:600 10.5px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);background:var(--s1)}}
td{{font-variant-numeric:tabular-nums}} tr:last-child td{{border-bottom:0}} td:first-child{{font-weight:600;color:var(--fg)}}
tbody tr:nth-child(2) td{{background:rgba(122,230,255,.06)}}
ol.list,ul.list{{margin:0;padding-left:20px;color:var(--muted);display:flex;flex-direction:column;gap:8px;max-width:78ch}}
code.k{{font:500 12.5px var(--mono);color:var(--fg);background:var(--s1);border:1px solid var(--border);border-radius:5px;padding:1px 5px}}
.small{{font-size:13px;color:var(--subtle)}}
@media (max-width:900px){{.g3,.g2,.cols{{grid-template-columns:1fr}} .gm{{grid-template-columns:minmax(0,330px)}}}}
{POSTER_CSS}
{ADMIN_CSS}
</style>
<div class="wrap">
  <header class="top">
    <span class="eyebrow">Concert Crawl · design · Nov 11</span>
    <h1 class="t">The invite poster</h1>
    <p class="lead">A Letter-size poster for venues, record shops and bars. It says what Concert Crawl is in one line, names the venues it covers, and puts a 4.5 in QR on white so it scans across a dark room. Each poster carries one shared code with a set number of seats.</p>
    <nav class="toc"><a href="#poster">The poster</a><a href="#scan">Why it scans</a><a href="#admin">Admin screen</a><a href="#build">What changes in code</a></nav>
  </header>

  <section class="s" id="poster">
    <h2>The poster</h2>
    <p>Night is the main design: the real CCMark, large, with its trail climbing toward the halo, the headline in the app’s cyan-to-pink, and a white QR card. A 0.3 in paper frame is designed in, because most printers can’t print to the edge and would leave an uneven white margin anyway. Paper is the one-ink version for black-and-white printers, photocopies and colored paper. Tear-off tabs are optional on either.</p>
    <div class="g3">
      {board(sheet('night'), 816, 1056, 'Night', 'Color printer. The default.')}
      {board(sheet('paper'), 816, 1056, 'Paper', 'Black ink only. The halo becomes two rings.')}
      {board(sheet('night', True), 816, 1056, 'Night with tear-off tabs', 'Nine tabs with the URL and code. The QR drops to 3.5 in.')}
    </div>
    <div class="cols">
      <div class="card"><h3>At a glance</h3><p><b>Every Denver show. One list.</b> is readable from across the room. The venue names under it are the proof, and they’re the names people in that room already know.</p></div>
      <div class="card"><h3>Want in</h3><p>The <b>BETA TESTERS WANTED</b> chip, the <b>LAUNCHING LATER · TESTING NOW</b> line and “Help us test it before launch” say it’s a test before launch, with no date that goes stale on the wall. The seat line (“This poster lets in 50 testers. When the spots are gone, they’re gone.”) makes it scarce.</p></div>
      <div class="card"><h3>Get in</h3><p>The QR opens the invite screen with the code filled in. For people who won’t scan, the short URL and the code are printed beside it, and the tabs carry both.</p></div>
    </div>
    <p class="small">All poster copy is new and needs copy review: the chip, the launching-later line, headline, sub, “Scan to test it”, the seat line, “No camera? Go to … and enter”, and “Not affiliated with the venues listed.” The venue count and list should come from the live venue table at print time.</p>
  </section>

  <section class="s" id="scan">
    <h2>Why it scans in a dark bar</h2>
    <p>The QR gets bigger modules by holding less. Today it encodes the full sign-up URL in mixed case, which forces byte mode and a version 4 code (33 modules). The proposal encodes a short all-caps redirect, <code class="k">HTTPS://CONCERTCRAWL.APP/I/BETA-7K2M-Q9XD</code>, which fits QR’s compact alphanumeric mode: version 3 (29 modules) even at the stronger Q error correction, which survives tape, glare and a scuffed corner. Printed at 4.5 in, each module is about 4 mm.</p>
    {scan_table()}
    <p class="small">How I tested: rendered each QR at print size, shrank it to what a 12 MP phone camera sees at each distance, cut the light to 15%, added sensor noise and blur, and decoded it with OpenCV, 8 trials per row. Phone camera apps are better than OpenCV, so real distances run longer, but the gap between today and the proposal holds. Rules the design keeps: black modules on white paper (never inverted, never brand-colored), a 4-module quiet zone, no logo inside the code, and matte paper.</p>
  </section>

  <section class="s" id="admin">
    <h2>Admin: print a poster</h2>
    <p>A <b>Posters</b> tab inside Invite codes. Three steps, top to bottom: pick a poster code (or mint one), pick a look, print. The preview on the right is the real sheet at scale, so what you see is what prints. Each code shows seats taken, scans and expiry, so you can see which wall is working. Full codes stay in the list, faded, so you know to replace that poster. In the current B+ style: one ambient glow (the page), a gradient edge only on the selected code.</p>
    {board(admin_desktop(), 1280, 1250, 'Posters · desktop', 'Hi-Dive bathroom is selected; Night, no tabs.')}
    <div class="g2">
      {board(admin_desktop(mint=True), 1280, 1250, 'New poster code', 'Label, seats (25, 50, 100 or any number to 500), expiry. Minting selects the new code and shows its preview.')}
      <div class="gm">
        {board(admin_mobile(), 390, 1330, 'Posters · mobile', 'Same three steps. The code picker is one row that opens a list. Print and QR stay pinned at the bottom.')}
      </div>
    </div>
  </section>

  <section class="s" id="build">
    <h2>What changes in code</h2>
    <p>The data model from PR #79 already fits: <code class="k">max_uses</code>, <code class="k">use_count</code>, <code class="k">label</code>, and the print rules. The changes are mostly the sheet and one route.</p>
    <ol class="list">
      <li><b>Restyle <code class="k">PosterSheet</code> and <code class="k">poster.css</code></b> to Night and Paper, using <code class="k">CCMark</code>’s geometry and <code class="k">BRAND_COPY.wordmark</code>. Add <code class="k">print-color-adjust: exact</code> so Night prints its background.</li>
      <li><b>Add a short redirect, <code class="k">/i/[code]</code></b>, matched case-insensitively, that sends the visitor to <code class="k">/auth/code?code=…</code>. The QR encodes it in all caps. It can also count scans per code, which the admin list shows.</li>
      <li><b>QR settings:</b> error correction Q, quiet zone 4, drawn 4.5 in wide (3.5 in with tabs). Keep the existing local <code class="k">uqr</code> drawing.</li>
      <li><b>Admin Posters tab</b> with the code list, the inline mint form, the look picker, the tabs switch and the live preview. QR download becomes SVG (sharp at any size).</li>
      <li><b>Copy</b> goes through copy-review, and the poster copy moves into <code class="k">lib/poster/definitions/copy.ts</code>.</li>
    </ol>
    <p class="small">Test prints: open <code class="k">design/invite-poster/test-print-night.html</code> (or -paper, -night-tabs) from the project files in Chrome and print at Letter, margins None, Background graphics on. The sample QR points at the proposed <code class="k">/i/</code> route, so it scans but won’t open a page until that route exists.</p>
  </section>
</div>
<script>
(function(){{
  function fit(){{document.querySelectorAll('.bd-fit').forEach(function(el){{
    var w=+el.dataset.w, s=el.clientWidth/w; var inn=el.firstElementChild; inn.style.transform='scale('+s+')';}});}}
  fit(); try{{new ResizeObserver(fit).observe(document.body);}}catch(e){{window.addEventListener('resize',fit);}}
}})();
</script>
'''

if __name__ == '__main__':
    open(OUT, 'w').write(HTML)
    print(OUT, len(HTML) // 1024, 'KB')
