import type { Theme, TerminalThemeColors } from './types'
import { builtInThemes } from './built-in-themes'

const themeMap = new Map<string, Theme>()
builtInThemes.forEach(t => themeMap.set(t.id, t))

export function getTheme(id: string): Theme | undefined {
  return themeMap.get(id)
}

export function getTerminalTheme(id: string): TerminalThemeColors {
  const theme = themeMap.get(id)
  if (!theme) {
    return themeMap.get('tokyo-night')!.terminal
  }
  return theme.terminal
}

export function listThemes(): Theme[] {
  return [...builtInThemes]
}

export function applyTheme(theme: Theme): TerminalThemeColors {
  const root = document.documentElement
  root.style.setProperty('--loki-bg', theme.colors.bg)
  root.style.setProperty('--loki-fg', theme.colors.fg)
  root.style.setProperty('--loki-border', theme.colors.border)
  root.style.setProperty('--loki-accent', theme.colors.accent)
  root.style.setProperty('--loki-sidebar', theme.colors.sidebar)
  root.style.setProperty('--loki-block-bg', theme.colors.blockBg)
  root.style.setProperty('--loki-block-hover', theme.colors.blockHover)
  root.style.setProperty('--loki-block-success', theme.colors.blockSuccess)
  root.style.setProperty('--loki-block-error', theme.colors.blockError)

  return theme.terminal
}

const STORAGE_KEY = 'loki-theme-id'

export function getStoredThemeId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? 'tokyo-night'
}

export function setStoredThemeId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}
