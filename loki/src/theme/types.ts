export interface Theme {
  id: string
  name: string
  author?: string
  colors: ThemeColors
  terminal: TerminalThemeColors
}

export interface ThemeColors {
  bg: string
  fg: string
  border: string
  accent: string
  sidebar: string
  blockBg: string
  blockHover: string
  blockSuccess: string
  blockError: string
}

export interface TerminalThemeColors {
  background: string
  foreground: string
  cursor: string
  cursorAccent: string
  selectionBackground: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}
