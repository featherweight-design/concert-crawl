import { THEMES, type ThemeName } from './themes'

export function applyTheme(name: ThemeName): void {
  const tokens = THEMES[name]
  const root = document.documentElement
  for (const [k, v] of Object.entries(tokens)) {
    root.style.setProperty(`--${k}`, v)
  }
  root.setAttribute('data-theme', name)
}
