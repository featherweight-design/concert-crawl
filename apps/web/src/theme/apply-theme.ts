import { THEMES, type ThemeName } from './themes'

export function applyTheme(name: ThemeName): void {
  const tokens = THEMES[name]
  const root = document.documentElement
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`--${key}`, value)
  }
  root.setAttribute('data-theme', name)
}
