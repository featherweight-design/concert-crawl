import { THEMES, THEME_NAMES } from '@/theme/themes';

// The error page carries its own styles: it has to render when globals.css,
// next/font and the ThemeProvider are the things that failed. The tokens come
// from `theme/themes.ts`, which is plain data, so there is no copy to drift.

const declarations = (tokens: Record<string, string>): string =>
  Object.entries(tokens)
    .map(([key, value]) => `--${key}:${value}`)
    .join(';');

/**
 * Electric, or Light for a light-mode system, until a stored theme sets
 * `data-theme`; then that theme, for all nine. The attribute rules out-rank
 * the bare class, so the order of the media query does not matter.
 */
export const THEME_TOKEN_CSS = [
  `.cc-err{${declarations(THEMES.electric)}}`,
  `@media (prefers-color-scheme: light){.cc-err{${declarations(THEMES.light)}}}`,
  ...THEME_NAMES.map(
    (name) => `[data-theme="${name}"] .cc-err{${declarations(THEMES[name])}}`,
  ),
].join('\n');

const KNOWN_THEMES = JSON.stringify(
  Object.fromEntries(THEME_NAMES.map((name) => [name, 1])),
);

/**
 * Runs before paint in `global-error.tsx`, which has its own `<html>` and so
 * none of the root layout's theme script. Inside the app the attribute is
 * already set.
 */
export const THEME_PREPAINT_SCRIPT = `(function(){try{var s=localStorage.getItem('cc-theme');var k=${KNOWN_THEMES};if(s&&Object.prototype.hasOwnProperty.call(k,s)){document.documentElement.setAttribute('data-theme',s);}}catch(e){}})();`;

const MONO =
  "var(--font-mono, 'JetBrains Mono'), ui-monospace, SFMono-Regular, Menlo, monospace";
const UI =
  'var(--font-ui, Inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const GRADIENT = 'linear-gradient(90deg, var(--signal), var(--accent))';
const EASE = 'var(--motion-fast, 140ms) var(--motion-ease, ease)';

const LAYOUT_CSS = `
.cc-err{box-sizing:border-box;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;padding:16px;color:var(--fg);font-family:${UI};-webkit-font-smoothing:antialiased;background:radial-gradient(120% 60% at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%), var(--bg)}
.cc-err *{box-sizing:border-box}
.cc-err button,.cc-err a,.cc-err input,.cc-err textarea{font-family:inherit;transition:background-color ${EASE},border-color ${EASE},color ${EASE},opacity ${EASE}}
.cc-err :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.cc-err-logo{display:inline-flex;align-items:center;gap:10px;align-self:flex-start;min-height:44px;color:var(--fg);text-decoration:none;font-weight:900;font-size:18px;letter-spacing:-0.025em}
.cc-err-logo span span{color:var(--accent)}
.cc-err-main{flex:1;display:flex;flex-direction:column;align-items:center;gap:32px;width:100%;max-width:1080px;margin:0 auto;padding:32px 0}
.cc-err-lead{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;width:100%;max-width:480px}
.cc-err-tile{display:grid;place-items:center;width:72px;height:72px;border-radius:18px;border:1px solid color-mix(in srgb, var(--danger) 50%, transparent);background:color-mix(in srgb, var(--danger) 12%, var(--surface-1))}
.cc-err-eyebrow{margin:8px 0 0;font-family:${MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--danger)}
.cc-err-h1{margin:0;font-size:clamp(30px, 8vw, 44px);font-weight:900;letter-spacing:-0.035em;line-height:1.05}
.cc-err-body{margin:0;max-width:420px;font-size:16px;line-height:1.5;color:var(--fg-muted)}
.cc-err-actions{display:flex;flex-direction:column;align-items:stretch;gap:8px;width:100%;margin-top:12px}
.cc-err-primary{min-height:48px;padding:0 28px;border:none;border-radius:12px;background:${GRADIENT};color:var(--fg-on-accent);font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 10px 28px -10px color-mix(in srgb, var(--signal) 70%, transparent)}
.cc-err-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 24px;border:1px solid transparent;border-radius:12px;background:none;color:var(--fg-muted);font-size:16px;font-weight:700;text-decoration:none;cursor:pointer}
.cc-err-secondary:hover{color:var(--fg)}
.cc-err-id{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:20px}
.cc-err-label{font-family:${MONO};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--fg-subtle)}
.cc-err-chip{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 10px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-1);color:var(--fg-muted);font-family:${MONO};font-size:13px;cursor:pointer}
.cc-err-chip:hover{border-color:var(--signal);color:var(--fg)}
.cc-err-card{position:relative;width:100%;max-width:440px;padding:16px 18px 18px;border:1px solid var(--border-strong);border-radius:18px;background:var(--bg-elevated);overflow:hidden;box-shadow:0 24px 48px -24px var(--shadow-strong)}
.cc-err-card::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:${GRADIENT}}
.cc-err-rail{display:flex;align-items:center;gap:8px;font-family:${MONO};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--fg-muted)}
.cc-err-rail-line{flex:1;height:1px;background:var(--border)}
.cc-err-dot{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 0 3px color-mix(in srgb, currentColor 25%, transparent)}
.cc-err-tone-accent{color:var(--accent)}.cc-err-tone-signal{color:var(--signal)}.cc-err-tone-success{color:var(--success)}.cc-err-tone-danger{color:var(--danger)}
.cc-err-h2{margin:14px 0 4px;font-size:19px;font-weight:800;letter-spacing:-0.02em}
.cc-err-h2:focus{outline:none}
.cc-err-sub{margin:0;font-size:13.5px;line-height:1.45;color:var(--fg-muted)}
.cc-err-fields{margin:0;padding:0;border:0;min-width:0}
.cc-err-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.cc-err-radio{position:relative;display:inline-flex}
.cc-err-radio input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.cc-err-pill{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border:1px solid var(--border-strong);border-radius:999px;color:var(--fg-muted);font-size:14px;font-weight:600;cursor:pointer}
.cc-err-radio input:checked+.cc-err-pill{border-color:var(--signal);color:var(--fg);background:color-mix(in srgb, var(--signal) 12%, transparent)}
.cc-err-radio input:focus-visible+.cc-err-pill{outline:2px solid var(--focus);outline-offset:2px}
.cc-err-fields:disabled .cc-err-pill{opacity:0.55;cursor:default}
.cc-err-note{display:block;width:100%;min-height:68px;margin-top:14px;padding:12px 14px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-1);color:var(--fg);font-size:16px;line-height:1.4;resize:vertical}
.cc-err-note:focus{outline:none;border-color:var(--signal)}
.cc-err-note:disabled{opacity:0.6}
.cc-err-attach{margin:14px 0 0}
.cc-err-attach-head{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.cc-err-attach-head svg{color:var(--success)}
.cc-err-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--border)}
.cc-err-row dd{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:${MONO};font-size:12.5px;color:var(--fg-muted)}
.cc-err-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}
.cc-err-text-btn{min-height:44px;padding:0 4px;border:none;background:none;color:var(--fg-muted);font-size:15px;font-weight:700;cursor:pointer}
.cc-err-text-btn:hover{color:var(--fg)}
.cc-err-send{min-height:44px;padding:0 22px;border:none;border-radius:12px;background:${GRADIENT};color:var(--fg-on-accent);font-size:15px;font-weight:700;cursor:pointer}
.cc-err-send:disabled{opacity:0.6;cursor:default}
.cc-err-outline{min-height:44px;padding:0 22px;border:1px solid var(--signal);border-radius:12px;background:none;color:var(--fg);font-size:15px;font-weight:700;cursor:pointer}
.cc-err-saved{margin-top:14px;padding:10px 12px;border:1px dashed var(--border-strong);border-radius:10px;font-size:13.5px;color:var(--fg-muted)}
.cc-err-saved p{margin:6px 0 0}.cc-err-saved strong{color:var(--fg)}
.cc-err-saved .cc-err-dot{display:inline-block;width:6px;height:6px;margin-right:8px;color:var(--warning);box-shadow:none}
.cc-err-sent{display:flex;align-items:flex-start;gap:14px;margin-top:14px}
.cc-err-sent .cc-err-h2{margin-top:0}
.cc-err-check{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:50%;border:1px solid color-mix(in srgb, var(--success) 50%, transparent);background:color-mix(in srgb, var(--success) 14%, transparent);color:var(--success)}
.cc-err-meta{margin:10px 0 0;font-size:12.5px;color:var(--fg-subtle)}
.cc-err-meta .cc-err-label{margin-right:8px}
.cc-err-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
/* Inside the app shell: the header and bottom nav are already there. */
.cc-err-embedded{min-height:0;background:none}
@media (max-width:639.98px){.cc-err-embedded{padding-bottom:calc(52px + env(safe-area-inset-bottom) + 16px)}}
@media (min-width:900px){
.cc-err{padding:16px 40px}
.cc-err-main{flex-direction:row;justify-content:space-between;align-items:center;gap:48px;padding:32px 60px}
.cc-err-lead{align-items:flex-start;text-align:left}
.cc-err-actions{flex-direction:row;align-items:center;gap:10px;width:auto}
.cc-err-secondary{border-color:var(--border-strong);color:var(--fg)}
.cc-err-id{justify-content:flex-start}
.cc-err-card{flex:none;width:440px}
}
@media (prefers-reduced-motion: reduce){.cc-err *{transition:none !important;animation:none !important}}
`;

export const STANDALONE_ERROR_CSS = `${THEME_TOKEN_CSS}\n${LAYOUT_CSS}`;
