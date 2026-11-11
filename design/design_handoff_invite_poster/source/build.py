"""Invite poster + admin print screen (B+). Writes poster.html (the review page) and test-print.html (one sheet, prints at Letter)."""
import segno, os

HERE = os.path.dirname(os.path.abspath(__file__))
CODE = 'BETA-7K2M-Q9XD'          # example code
QR_TEXT = f'HTTPS://CONCERTCRAWL.APP/I/{CODE}'   # all-caps: QR alphanumeric mode, version 3 at Q
SEATS = 50
VENUES = ['Bluebird', 'Ogden', 'Gothic', 'Mission Ballroom', 'Fillmore', 'Red Rocks', 'Hi-Dive', 'Larimer Lounge', 'Globe Hall',
          'Lost Lake', 'Marquis', 'Summit', 'Cervantes’', 'Oriental', 'Meow Wolf', 'Levitt Pavilion', 'Black Box', 'Ball Arena']

E = dict(bg='#070A1A', el='#0E1226', s1='#11162E', s2='#171D3A', s3='#1F2748', fg='#E8F3FF', muted='#9AA8C7', subtle='#5A6788',
         border='#1F2748', bs='#2C3661', signal='#7AE6FF', accent='#FF7BD4', success='#7BFFB0', warning='#FFD27A', danger='#FF7A8A')
TRAIL = [(14, 76, 1.5), (24, 70, 2), (34, 64, 2.5), (42, 58, 3), (50, 50, 4), (58, 42, 5), (66, 32, 6)]


def qr_svg(text, px, ink='#000', quiet=4, cls='qr'):
    q = segno.make(text, error='q', micro=False)
    rows = list(q.matrix_iter(border=quiet))
    n = len(rows)
    d = ''.join(f'M{x} {y}h1v1h-1z' for y, r in enumerate(rows) for x, v in enumerate(r) if v)
    return (f'<svg class="{cls}" width="{px}" height="{px}" viewBox="0 0 {n} {n}" shape-rendering="crispEdges" role="img" '
            f'aria-label="QR code for invite {CODE}"><rect width="{n}" height="{n}" fill="#fff"/><path d="{d}" fill="{ink}"/></svg>'), q.version, n


def mark(size, sig, acc, core=None, tile=None, halo=True, ink_mode=False):
    """The locked CCMark geometry (components/brand/cc-mark)."""
    core = core or sig
    t = f'<rect width="96" height="96" rx="16" fill="{tile}"/>' if tile else ''
    if ink_mode:  # one ink: halo as rings, so it survives a B&W laser
        h = (f'<circle cx="72" cy="24" r="19" fill="none" stroke="{acc}" stroke-width="1.2" opacity=".55"/>'
             f'<circle cx="72" cy="24" r="12" fill="none" stroke="{acc}" stroke-width="1.6" opacity=".8"/>')
    else:
        h = (f'<circle cx="72" cy="24" r="20" fill="{acc}" opacity="0.22"/><circle cx="72" cy="24" r="12" fill="{acc}" opacity="0.42"/>') if halo else ''
    dots = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{sig}" opacity="{0.35 + i * 0.09:.2f}"/>' for i, (x, y, r) in enumerate(TRAIL))
    return f'<svg width="{size}" height="{size}" viewBox="0 0 96 96" aria-hidden="true" style="display:block;flex:none">{t}{h}<circle cx="72" cy="24" r="7" fill="{core}"/>{dots}</svg>'


def wordmark(size, fg, acc):
    return f'<span class="wm" style="font-size:{size}px;color:{fg}">concert<span style="color:{acc}">crawl.</span></span>'


COPY = dict(
    chip='Beta testers wanted',
    kicker='Launching later · Testing now',
    headline='Every Denver show. <em>One list.</em>',
    sub='We check 21 venue calendars every night and put every show in one place. Help us test it before launch. It’s free.',
    scan='Scan to test it',
    seats=f'This poster lets in <b>{SEATS} testers</b>. When the spots are gone, they’re gone.',
    typed='No camera? Go to',
    url='concertcrawl.app/i',
    code_label='and enter',
    fine='Not affiliated with the venues listed.',
)


def venues_line():
    return '<span class="vsep">·</span>'.join(f'<span>{v}</span>' for v in VENUES) + '<span class="vsep">·</span><span>and more</span>'


def sheet(variant='night', tabs=False):
    night = variant == 'night'
    qrpx = 336 if tabs else 432
    qr, ver, n = qr_svg(QR_TEXT, qrpx)
    sig, acc = (E['signal'], E['accent']) if night else ('#111', '#111')
    fg = E['fg'] if night else '#111'
    m = mark(360 if not tabs else 290, sig, acc, ink_mode=not night)
    tabs_html = ''
    if tabs:
        t = ''.join(f'<div class="tab"><span>concertcrawl.app/i</span><b>{CODE}</b></div>' for _ in range(9))
        tabs_html = f'<div class="tabs">{t}</div>'
    return f'''
<div class="sheet {variant}{' has-tabs' if tabs else ''}">
  <div class="panel">
    <div class="p-top">{wordmark(30, fg, acc)}<span class="p-chip">{COPY['chip']}</span></div>
    <div class="p-hero">
      <div class="p-copy">
        <p class="p-kicker">{COPY['kicker']}</p>
        <h2 class="p-head">{COPY['headline']}</h2>
      </div>
      <div class="p-mark">{m}</div>
    </div>
    <p class="p-sub">{COPY['sub']}</p>
    <p class="p-venues">{venues_line()}</p>
    <div class="p-qrcard">
      <div class="p-qr">{qr}</div>
      <div class="p-side">
        <p class="p-scan">{COPY['scan']}</p>
        <svg class="p-arrow" viewBox="0 0 60 24" aria-hidden="true"><path d="M58 12H6M14 4L4 12l10 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <p class="p-seats">{COPY['seats']}</p>
        <div class="p-typed">
          <small>{COPY['typed']}</small>
          <b class="p-url">{COPY['url']}</b>
          <small>{COPY['code_label']}</small>
          <b class="p-code">{CODE}</b>
        </div>
      </div>
    </div>
    <p class="p-fine">{COPY['fine']}</p>
  </div>
  {tabs_html}
</div>'''


POSTER_CSS = '''
/* ---------- the sheet: US Letter at 96 css px per inch ---------- */
.sheet{position:relative;width:816px;height:1056px;flex:none;background:#fff;font-family:Inter,system-ui,sans-serif;overflow:hidden;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet .wm{font-weight:900;letter-spacing:-0.025em;line-height:1;white-space:nowrap}
.sheet p,.sheet h2{margin:0}
/* 0.3in paper frame on Night: printers that can't print to the edge leave a white margin anyway, so it's designed in */
.sheet .panel{position:absolute;inset:0;padding:44px 48px 30px;display:flex;flex-direction:column}
.sheet.night .panel{inset:29px;padding:36px 40px 22px;background:
  radial-gradient(720px 560px at 96% 2%,rgba(160,117,255,.22),transparent 64%),#070A1A;color:#E8F3FF}
.sheet.paper{color:#111}
.p-top{display:flex;align-items:center;justify-content:space-between}
.p-chip{display:inline-flex;align-items:center;height:30px;padding:0 14px;border-radius:999px;font:600 12px/1 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase}
.night .p-chip{border:1.5px solid #FF7BD4;color:#FF7BD4}
.paper .p-chip{border:2px solid #111}
.p-hero{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:22px}
.p-copy{flex:1;min-width:0}
.p-kicker{font:600 13px/1 'JetBrains Mono',monospace;letter-spacing:.2em;text-transform:uppercase}
.night .p-kicker{color:#7AE6FF}
.p-head{margin-top:16px;font-weight:900;font-size:70px;line-height:.96;letter-spacing:-0.035em;text-wrap:balance}
.night .p-head em{font-style:normal;background:linear-gradient(90deg,#7AE6FF,#FF7BD4);-webkit-background-clip:text;background-clip:text;color:transparent}
.paper .p-head em{font-style:normal}
.p-mark{margin:-40px -30px 0 -60px;flex:none}
.p-sub{margin-top:18px;font-size:20px;line-height:1.38;max-width:620px;text-wrap:pretty}
.night .p-sub{color:#C9D6EE}
.p-venues{margin-top:20px;font:600 10.5px/1.75 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;text-wrap:balance}
.night .p-venues{color:#9AA8C7}
.p-venues{margin-bottom:22px}
.p-venues .vsep{padding:0 7px;opacity:.6}
.p-qrcard{margin-top:auto;display:flex;align-items:stretch;gap:22px;border-radius:18px;background:#fff;color:#070A1A;padding:0 26px 0 0}
.paper .p-qrcard{border:3px solid #111}
.p-qr{flex:none;padding:6px}
.p-qr .qr{display:block}
.p-side{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;padding:22px 0}
.p-scan{font-weight:900;font-size:40px;line-height:.98;letter-spacing:-0.03em;text-wrap:balance}
.p-arrow{width:60px;height:24px;margin-top:14px;color:#E0297A}
.paper .p-arrow{color:#111}
.p-seats{margin-top:14px;font-size:15.5px;line-height:1.38;color:#2B3352}
.p-seats b{color:#070A1A}
.p-typed{margin-top:auto;padding-top:14px;border-top:2px solid #070A1A;display:flex;flex-direction:column;gap:3px}
.p-typed small{font:600 10px/1.3 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#4A5374}
.p-url{font:700 16px/1.2 'JetBrains Mono',monospace}
.p-code{font:700 19px/1.2 'JetBrains Mono',monospace;letter-spacing:.02em}
.p-fine{margin-top:12px;font:500 9px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;text-align:right}
.night .p-fine{color:#5A6788}
.paper .p-fine{color:#555}
/* tear-off tabs: bottom 1.55in of the page, outside the night panel */
.has-tabs .panel{bottom:178px}
.sheet.night.has-tabs .panel{bottom:178px}
.has-tabs .p-head{font-size:68px}
.has-tabs .p-scan{font-size:34px}
.tabs{position:absolute;left:0;right:0;bottom:0;height:150px;display:flex;border-top:2px dashed #111}
.tab{flex:1;border-left:1.5px dashed #888;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  writing-mode:vertical-rl;transform:rotate(180deg);color:#111}
.tab:first-child{border-left:0}
.tab b{font:700 14px/1 'JetBrains Mono',monospace}
.tab span{font:500 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.04em}
'''

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">'


def test_print(variant, tabs=False):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Invite poster test print</title>{FONTS}
<style>@page{{size:letter;margin:0}}html,body{{margin:0;background:#2a2622}}body{{display:flex;justify-content:center;padding:24px 0}}
@media print{{html,body{{background:none;padding:0}}}}{POSTER_CSS}</style></head><body>{sheet(variant, tabs)}</body></html>'''


if __name__ == '__main__':
    for v, t, name in [('night', False, 'test-print-night'), ('paper', False, 'test-print-paper'), ('night', True, 'test-print-night-tabs')]:
        open(os.path.join(HERE, name + '.html'), 'w').write(test_print(v, t))
    print(qr_svg(QR_TEXT, 432)[1:])


# ====================================================================== admin (B+)
LU = {
 'dash': '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
 'pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
 'refresh': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
 'calcheck': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
 'music': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 'inbox': '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
 'toggle': '<rect width="20" height="12" x="2" y="6" rx="6" ry="6"/><circle cx="8" cy="12" r="2"/>',
 'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 'key': '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
 'printer': '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
 'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
 'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
 'scissors': '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
 'scan': '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
 'check': '<path d="M20 6 9 17l-5-5"/>',
 'chev': '<path d="m6 9 6 6 6-6"/>',
 'back': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
 'menu': '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
 'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
 'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
}


def lu(name, size=16, color='currentColor', sw=1.75):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true" style="flex:none;display:block">{LU[name]}</svg>')


def lockup(size=15):
    return (f'<div class="lock"><div class="lock-tile">{mark(round(size * 1.9), E["signal"], E["accent"], tile=E["bg"])}</div>'
            f'{wordmark(size, E["fg"], E["accent"])}</div>')


NAV = [('dash', 'Dashboard'), ('pin', 'Venues'), ('refresh', 'Crawl'), ('calcheck', 'Review'), ('music', 'Artists'), ('inbox', 'Feedback'),
       ('toggle', 'Feature flags'), ('users', 'Users'), ('key', 'Invite codes')]


def sidebar():
    items = ''.join(f'<div class="nv{" on" if n == "Invite codes" else ""}">{lu(i, 16)}<span>{n}</span></div>' for i, n in NAV)
    return (f'<aside class="sb"><div class="sb-top">{lockup(15)}<span class="chip-sm">ADMIN</span></div><nav>{items}</nav>'
            f'<div class="sb-foot"><div class="av">H</div><div><b>Hugh</b><small>Back to the app</small></div></div></aside>')


CODES = [
    dict(label='Hi-Dive bathroom, Nov', code=CODE, taken=12, seats=50, scans=41, exp='Never expires', state='on'),
    dict(label='Record shop on Colfax', code='BETA-3PLR-8WNA', taken=3, seats=25, scans=9, exp='Expires Dec 31', state=''),
    dict(label='Larimer flyer wall', code='BETA-H4TQ-2ZMC', taken=50, seats=50, scans=118, exp='Never expires', state='full'),
]


def code_card(c):
    pct = c['taken'] / c['seats'] * 100
    full = c['state'] == 'full'
    right = ('<span class="chip-st full">FULL</span>' if full else
             f'<span class="radio{" on" if c["state"] == "on" else ""}">{lu("check", 12, E["bg"], 3) if c["state"] == "on" else ""}</span>')
    foot = ('Every seat is taken. Mint a new code to put up another poster.' if full else
            f'{c["scans"]} scans · {c["exp"]}')
    return f'''<div class="cc {c['state']}">
  <div class="cc-row"><div class="cc-main"><b>{c['label']}</b><code>{c['code']}</code></div>{right}</div>
  <div class="cc-bar"><i style="width:{pct:.0f}%"></i></div>
  <div class="cc-row cc-meta"><span><b>{c['taken']}</b> of {c['seats']} seats taken</span><span>{foot if not full else ''}</span></div>
  {f'<p class="cc-note">{foot}</p>' if full else ''}
</div>'''


def look_tiles(sel='night'):
    def t(key, name, line):
        on = key == sel
        thumb = f'<div class="lt-thumb {key}"><i></i><i></i><i></i><span></span></div>'
        return (f'<div class="lt{" on" if on else ""}">{thumb}<div class="lt-copy"><b>{name}</b><small>{line}</small></div>'
                f'<span class="radio{" on" if on else ""}">{lu("check", 12, E["bg"], 3) if on else ""}</span></div>')
    return t('night', 'Night', 'Color printer. Reads best in a dark bar.') + t('paper', 'Paper', 'Any printer, black ink. Copies well, works on colored paper.')


def tabs_toggle(on=False):
    return (f'<div class="tg-row"><div class="tg-ic">{lu("scissors", 16)}</div><div class="tg-copy"><b>Tear-off tabs</b>'
            f'<small>Nine tabs with the code along the bottom. The QR shrinks to 3.5 in, so it scans from about 6 ft instead of 8.</small></div>'
            f'<span class="sw{" on" if on else ""}"><i></i></span></div>')


def print_block(compact=False):
    return f'''<div class="pr">
  <button class="btn-p">{lu('printer', 16)}Print poster</button>
  <button class="btn-g">{lu('download', 16)}QR as SVG</button>
</div>
<div class="pr-tips">
  <p class="mono-l">In the print dialog</p>
  <ul><li>{lu('check', 13)}<b>Letter</b> at <b>100%</b> scale</li><li>{lu('check', 13)}Margins: <b>None</b></li>
  <li>{lu('check', 13)}<b>Background graphics</b> on (Night needs it)</li><li>{lu('check', 13)}Headers and footers off</li></ul>
  <p class="pr-scan">{lu('scan', 15)}Before you hang it, scan the printout from across the room.</p>
</div>'''


def preview(scale, variant='night', tabs=False):
    w, h = round(816 * scale), round(1056 * scale)
    return (f'<div class="pv-fit" style="width:{w}px;height:{h}px"><div class="pv-sheet" style="transform:scale({scale})">{sheet(variant, tabs)}</div></div>')


def admin_desktop(mint=False):
    if mint:
        left = f'''
      <section class="st"><div class="st-h"><span class="st-n">1</span><b>Code</b></div>
        <div class="mint">
          <p class="mint-h">New poster code</p>
          <label class="fld"><span>Where it’s going</span><div class="in">Record shop on Colfax, Dec</div><small>Only admins see this. It helps you tell posters apart.</small></label>
          <div class="fld"><span>Seats</span><div class="seg"><i>25</i><i class="on">50</i><i>100</i><i class="cust">Other</i></div>
            <small>How many people this one code lets in. 1 to 500.</small></div>
          <div class="fld"><span>Expires</span><div class="seg"><i class="on">Never</i><i>30 days</i><i>90 days</i></div></div>
          <div class="mint-act"><button class="btn-g sm">Cancel</button><button class="btn-p sm">Mint and preview</button></div>
        </div>
        {code_card(CODES[0])}
      </section>'''
    else:
        left = f'''
      <section class="st"><div class="st-h"><span class="st-n">1</span><b>Code</b><button class="lnk">{lu('plus', 14)}New poster code</button></div>
        {''.join(code_card(c) for c in CODES)}
        <p class="foot-note">{lu('info', 13)}Personal codes (1 seat) don’t show here. A poster needs a code many people can use.</p>
      </section>'''
    return f'''<div class="adm">
  {sidebar()}
  <main class="am">
    <div class="tb"><span class="crumb">Invite codes <i>/</i> <b>Posters</b></span><div class="tb-r"><span class="kbd">⌘K</span><div class="av sm">H</div></div></div>
    <div class="am-body">
      <div class="am-head">
        <div><h1>Print a poster</h1><p>One shared code per poster. Pick the code, pick the look, print at Letter.</p></div>
        <div class="tabs-ul"><span>Codes</span><span class="on">Posters</span></div>
      </div>
      <div class="am-grid">
        <div class="am-left">
          {left}
          <section class="st"><div class="st-h"><span class="st-n">2</span><b>Look</b></div>{look_tiles()}{tabs_toggle()}</section>
          <section class="st"><div class="st-h"><span class="st-n">3</span><b>Print</b></div>{print_block()}</section>
        </div>
        <div class="am-right">
          <div class="pv-bar"><span class="mono-l">Preview · 8.5 × 11 in</span><span class="pv-spec">QR 4.5 in · scans from about 8 ft</span></div>
          <div class="mat{' dim' if mint else ''}">{preview(0.64)}{'<p class="mat-note">The preview switches to the new code once it’s minted.</p>' if mint else ''}</div>
        </div>
      </div>
    </div>
  </main>
</div>'''


def admin_mobile():
    return f'''<div class="admm">
  <div class="mtb"><span class="mtb-b">{lu('menu', 20)}</span>{lockup(14)}<span class="chip-sm">ADMIN</span><span class="mtb-sp"></span><div class="av sm">H</div></div>
  <div class="mb">
    <span class="crumb sm">{lu('back', 14)}Invite codes</span>
    <h1>Print a poster</h1>
    <section class="st"><div class="st-h"><span class="st-n">1</span><b>Code</b><button class="lnk">{lu('plus', 14)}New</button></div>
      <div class="sel">{code_card(CODES[0])}<span class="sel-ch">{lu('chev', 16)}</span></div>
      <p class="sel-more">2 more poster codes, 1 full</p>
    </section>
    <section class="st"><div class="st-h"><span class="st-n">2</span><b>Look</b></div>
      <div class="seg wide"><i class="on">Night</i><i>Paper</i></div>
      {tabs_toggle()}
    </section>
    <div class="mat m">{preview(0.4)}</div>
    <p class="pv-spec c">QR 4.5 in · scans from about 8 ft</p>
    <section class="st"><div class="st-h"><span class="st-n">3</span><b>Print</b></div>{print_block()}</section>
  </div>
  <div class="mbar"><button class="btn-g">{lu('download', 16)}QR</button><button class="btn-p">{lu('printer', 16)}Print poster</button></div>
</div>'''


ADMIN_CSS = f'''
.adm,.admm{{font-family:Inter,system-ui,sans-serif;color:{E['fg']};background:radial-gradient(1100px 650px at 0% 0%,rgba(198,124,234,.14),transparent 65%),linear-gradient(180deg,#0e1121,{E['bg']});}}
.adm button,.admm button{{font:inherit;color:inherit;border:0;background:none;cursor:pointer}}
.adm h1,.admm h1,.adm p,.admm p{{margin:0}}
.adm{{width:1280px;height:1250px;display:flex;overflow:hidden}}
.lock{{display:flex;align-items:center;gap:9px}}
.lock-tile{{border-radius:7px;overflow:hidden;border:1px solid {E['border']};flex:none}}
.wm{{font-weight:900;letter-spacing:-0.025em;line-height:1;white-space:nowrap}}
.chip-sm{{display:inline-flex;align-items:center;justify-content:center;height:18px;padding:0 6px;border-radius:5px;font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:{E['accent']};background:rgba(255,123,212,.12);border:1px solid rgba(255,123,212,.35)}}
.sb{{width:232px;flex:none;border-right:1px solid {E['border']};background:rgba(14,18,38,.72);display:flex;flex-direction:column;padding:18px 12px}}
.sb-top{{display:flex;align-items:center;gap:8px;padding:0 6px 18px}}
.sb nav{{display:flex;flex-direction:column;gap:2px}}
.nv{{display:flex;align-items:center;gap:11px;height:36px;padding:0 10px;border-radius:9px;font-size:13.5px;font-weight:500;color:{E['muted']}}}
.nv.on{{color:{E['fg']};background:{E['s2']};box-shadow:inset 2px 0 0 {E['signal']}}}
.nv.on svg{{color:{E['signal']}}}
.sb-foot{{margin-top:auto;display:flex;align-items:center;gap:10px;padding:12px 8px 0;border-top:1px solid {E['border']}}}
.sb-foot b{{display:block;font-size:13px}} .sb-foot small{{font-size:11.5px;color:{E['muted']}}}
.av{{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:{E['accent']};background:#3a2546;border:1.5px solid {E['accent']};flex:none}}
.av.sm{{width:28px;height:28px;font-size:12px}}
.am{{flex:1;min-width:0;display:flex;flex-direction:column}}
.tb{{height:56px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid {E['border']}}}
.crumb{{font-size:13px;color:{E['muted']};display:inline-flex;align-items:center;gap:6px}} .crumb i{{font-style:normal;color:{E['subtle']}}} .crumb b{{color:{E['fg']};font-weight:600}}
.tb-r{{display:flex;align-items:center;gap:12px}}
.kbd{{font:500 11px/1 'JetBrains Mono',monospace;color:{E['muted']};border:1px solid {E['bs']};border-radius:6px;padding:5px 7px}}
.am-body{{flex:1;min-height:0;padding:22px 28px 0;display:flex;flex-direction:column}}
.am-head{{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}}
.am-head h1{{font-size:26px;font-weight:800;letter-spacing:-0.02em}}
.am-head p{{margin-top:6px;font-size:14px;color:{E['muted']}}}
.tabs-ul{{display:flex;gap:22px;font-size:13.5px;font-weight:600;color:{E['muted']}}}
.tabs-ul span{{padding-bottom:9px;border-bottom:2px solid transparent}}
.tabs-ul .on{{color:{E['fg']};border-color:{E['signal']}}}
.am-grid{{flex:1;min-height:0;display:grid;grid-template-columns:400px 1fr;gap:28px;margin-top:18px}}
.am-left{{overflow:hidden;display:flex;flex-direction:column;gap:22px;padding-bottom:24px}}
.st{{display:flex;flex-direction:column;gap:10px}}
.st-h{{display:flex;align-items:center;gap:10px;font-size:14px}}
.st-n{{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 11px/1 'JetBrains Mono',monospace;color:{E['signal']};border:1px solid rgba(122,230,255,.45)}}
.lnk{{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12.5px!important;font-weight:600;color:{E['signal']}!important}}
.cc{{border:1px solid {E['border']};background:{E['el']};border-radius:12px;padding:11px 13px;display:flex;flex-direction:column;gap:8px}}
.cc.on{{border:1px solid transparent;background:linear-gradient({E['el']},{E['el']}) padding-box,linear-gradient(135deg,{E['signal']},{E['accent']} 55%,{E['border']}) border-box}}
.cc.full{{opacity:.62}}
.cc-row{{display:flex;align-items:center;justify-content:space-between;gap:10px}}
.cc-main{{display:flex;align-items:baseline;gap:10px;min-width:0}}
.cc-main b{{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.cc-main code{{font:500 11.5px/1 'JetBrains Mono',monospace;color:{E['muted']};white-space:nowrap}}
.cc-bar{{height:4px;border-radius:2px;background:{E['s3']};overflow:hidden}}
.cc-bar i{{display:block;height:100%;background:linear-gradient(90deg,{E['signal']},{E['accent']});border-radius:2px}}
.cc.full .cc-bar i{{background:{E['muted']}}}
.cc-meta{{font-size:12px;color:{E['muted']}}} .cc-meta b{{color:{E['fg']};font-weight:600}}
.cc-note{{font-size:12px;color:{E['muted']}}}
.radio{{width:20px;height:20px;border-radius:50%;border:1.5px solid {E['bs']};flex:none;display:flex;align-items:center;justify-content:center}}
.radio.on{{background:{E['signal']};border-color:{E['signal']}}}
.chip-st{{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:5px;font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.12em}}
.chip-st.full{{color:{E['muted']};border:1px solid {E['bs']}}}
.foot-note{{display:flex;gap:7px;align-items:flex-start;font-size:12px;line-height:1.45;color:{E['subtle']}}} .foot-note svg{{margin-top:2px}}
.lt{{display:flex;align-items:center;gap:12px;padding:10px 13px 10px 10px;border-radius:12px;border:1px solid {E['border']};background:{E['el']}}}
.lt.on{{border-color:{E['signal']};background:#0f1a2e}}
.lt-copy{{flex:1;min-width:0}} .lt-copy b{{display:block;font-size:14px;font-weight:600}} .lt-copy small{{display:block;margin-top:2px;font-size:12px;line-height:1.4;color:{E['muted']}}}
.lt-thumb{{width:38px;height:49px;flex:none;border-radius:3px;position:relative;padding:5px 5px;display:flex;flex-direction:column;gap:3px}}
.lt-thumb.night{{background:#070A1A;box-shadow:0 0 0 2px #fff}}
.lt-thumb.paper{{background:#fff}}
.lt-thumb i{{display:block;height:3px;border-radius:1px;width:70%}} .lt-thumb i:nth-child(2){{width:55%}} .lt-thumb i:nth-child(3){{width:40%}}
.lt-thumb.night i{{background:#E8F3FF}} .lt-thumb.paper i{{background:#111}}
.lt-thumb span{{position:absolute;left:5px;right:5px;bottom:5px;height:19px;border-radius:2px;background:#fff;
  background-image:repeating-linear-gradient(90deg,#111 0 2px,transparent 2px 4px),repeating-linear-gradient(0deg,#111 0 2px,transparent 2px 4px);background-size:12px 12px;background-repeat:no-repeat;background-position:3px 3px}}
.lt-thumb.paper span{{outline:1.5px solid #111}}
.tg-row{{display:flex;align-items:center;gap:12px;padding:10px 13px;border-radius:12px;border:1px solid {E['border']}}}
.tg-ic{{width:38px;display:flex;justify-content:center;color:{E['muted']}}}
.tg-copy{{flex:1;min-width:0}} .tg-copy b{{display:block;font-size:14px;font-weight:600}} .tg-copy small{{display:block;margin-top:2px;font-size:12px;line-height:1.4;color:{E['muted']}}}
.sw{{width:36px;height:22px;border-radius:11px;background:{E['s3']};flex:none;position:relative}}
.sw i{{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:{E['muted']}}}
.sw.on{{background:{E['signal']}}} .sw.on i{{left:17px;background:{E['bg']}}}
.pr{{display:flex;gap:10px}}
.btn-p{{flex:1;height:44px;border-radius:11px!important;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700!important;font-size:14px!important;
  color:{E['bg']}!important;background:linear-gradient(135deg,{E['signal']},#bfb2f0)!important}}
.btn-g{{height:44px;padding:0 16px;border-radius:11px!important;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600!important;font-size:13.5px!important;border:1px solid {E['bs']}!important}}
.btn-p.sm,.btn-g.sm{{height:36px;flex:none;padding:0 14px}}
.pr-tips{{border-radius:12px;background:{E['s1']};padding:12px 14px}}
.mono-l{{font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:{E['muted']}}}
.pr-tips ul{{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:1fr;gap:7px;font-size:12.5px;color:{E['muted']}}}
.pr-tips li{{display:flex;align-items:center;gap:6px}} .pr-tips li svg{{color:{E['success']}}} .pr-tips b{{color:{E['fg']};font-weight:600}}
.pr-scan{{margin-top:11px!important;padding-top:10px;border-top:1px solid {E['border']};display:flex;align-items:center;gap:7px;font-size:12.5px;color:{E['fg']}}}
.pr-scan svg{{color:{E['signal']}}}
.am-right{{min-width:0;display:flex;flex-direction:column;gap:10px}}
.pv-bar{{display:flex;justify-content:space-between;align-items:center}}
.pv-spec{{font:500 11.5px/1 'JetBrains Mono',monospace;color:{E['signal']}}}
.pv-spec.c{{text-align:center}}
.mat{{flex:none;border-radius:16px;background:#1a1d2c;border:1px solid {E['border']};display:flex;justify-content:center;align-items:flex-start;padding:22px 0}}
.mat{{position:relative}} .mat.dim .pv-fit{{opacity:.28}}
.mat-note{{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:300px;text-align:center;font-size:14px;font-weight:600;padding:14px 16px;border-radius:12px;background:rgba(7,10,26,.9);border:1px solid {E['bs']}}}
.mat.m{{flex:none;padding:16px 0;border-radius:14px}}
.pv-fit{{position:relative;flex:none;box-shadow:0 18px 50px rgba(0,0,0,.55)}}
.pv-sheet{{position:absolute;left:0;top:0;transform-origin:top left}}
.mint{{border-radius:12px;padding:14px;background:{E['el']};border:1px solid {E['bs']};display:flex;flex-direction:column;gap:12px}}
.mint-h{{font-size:14px;font-weight:700}}
.fld{{display:flex;flex-direction:column;gap:6px}} .fld>span{{font-size:12.5px;font-weight:600;color:{E['muted']}}} .fld small{{font-size:11.5px;color:{E['subtle']}}}
.in{{height:38px;border-radius:9px;border:1px solid {E['signal']};background:{E['bg']};padding:0 12px;display:flex;align-items:center;font-size:13.5px;box-shadow:0 0 0 3px rgba(122,230,255,.14)}}
.seg{{display:flex;gap:4px;padding:3px;border-radius:10px;background:{E['bg']};border:1px solid {E['border']}}}
.seg i{{flex:1;font-style:normal;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:600;color:{E['muted']}}}
.seg i.on{{background:{E['s3']};color:{E['fg']};box-shadow:inset 0 0 0 1px {E['signal']}}}
.seg.wide i{{height:36px;font-size:13.5px}}
.mint-act{{display:flex;justify-content:flex-end;gap:8px}}
/* mobile */
.admm{{width:390px;position:relative;padding-bottom:84px}}
.mtb{{height:56px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid {E['border']};background:rgba(14,18,38,.8)}}
.mtb-b{{color:{E['muted']}}} .mtb-sp{{flex:1}}
.mb{{padding:16px 16px 0;display:flex;flex-direction:column;gap:18px}}
.crumb.sm{{font-size:12.5px}}
.mb h1{{font-size:24px;font-weight:800;letter-spacing:-0.02em;margin-top:-8px!important}}
.sel{{position:relative}} .sel .cc{{padding-right:40px}} .sel .radio{{display:none}}
.sel-ch{{position:absolute;right:13px;top:13px;color:{E['muted']}}}
.sel-more{{font-size:12px;color:{E['subtle']};margin-top:-2px!important}}
.admm .pr-tips ul{{grid-template-columns:1fr}}
.admm .pr{{display:none}}
.mbar{{position:absolute;left:0;right:0;bottom:0;display:flex;gap:10px;padding:12px 16px 20px;background:rgba(7,10,26,.94);border-top:1px solid {E['border']}}}
.mbar .btn-g{{flex:none}}
'''
