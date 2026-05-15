const FG_COLORS: Record<number, string> = {
  30: '#1a1b26', 31: '#f7768e', 32: '#9ece6a', 33: '#e0af68',
  34: '#7aa2f7', 35: '#bb9af7', 36: '#7dcfff', 37: '#c0caf5',
  90: '#565f89', 91: '#f7768e', 92: '#9ece6a', 93: '#e0af68',
  94: '#7aa2f7', 95: '#bb9af7', 96: '#7dcfff', 97: '#c0caf5',
}

const BG_COLORS: Record<number, string> = {
  40: '#1a1b26', 41: '#f7768e', 42: '#9ece6a', 43: '#e0af68',
  44: '#7aa2f7', 45: '#bb9af7', 46: '#7dcfff', 47: '#c0caf5',
  100: '#565f89', 101: '#f7768e', 102: '#9ece6a', 103: '#e0af68',
  104: '#7aa2f7', 105: '#bb9af7', 106: '#7dcfff', 107: '#c0caf5',
}

interface StyleState {
  fg: string | null
  bg: string | null
  bold: boolean
  italic: boolean
  underline: boolean
}

const SGR_RE = /\x1b\[([0-9;]*)m/g

export function ansiToHtml(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const state: StyleState = { fg: null, bg: null, bold: false, italic: false, underline: false }
  let result = ''
  let lastIndex = 0
  let openSpans = 0

  for (const match of escaped.matchAll(SGR_RE)) {
    result += escaped.slice(lastIndex, match.index!)
    lastIndex = match.index! + match[0].length

    const codes = match[1] ? match[1].split(';').map(Number) : [0]
    applySgrCodes(codes, state)
    // Close previous span if any before opening new one
    if (openSpans > 0) {
      result += '</span>'
      openSpans--
    }
    const tag = buildStyleTag(state)
    if (tag) {
      result += tag
      openSpans++
    }
  }

  result += escaped.slice(lastIndex)
  // Close any remaining open spans
  for (let i = 0; i < openSpans; i++) {
    result += '</span>'
  }
  return result
}

function applySgrCodes(codes: number[], state: StyleState): void {
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]
    switch (true) {
      case code === 0:
        state.fg = null
        state.bg = null
        state.bold = false
        state.italic = false
        state.underline = false
        break
      case code === 1:
        state.bold = true
        break
      case code === 3:
        state.italic = true
        break
      case code === 4:
        state.underline = true
        break
      case code === 22:
        state.bold = false
        break
      case code === 23:
        state.italic = false
        break
      case code === 24:
        state.underline = false
        break
      case code === 39:
        state.fg = null
        break
      case code === 49:
        state.bg = null
        break
      case code >= 30 && code <= 37:
      case code >= 90 && code <= 97:
        state.fg = FG_COLORS[code] ?? null
        break
      case code >= 40 && code <= 47:
      case code >= 100 && code <= 107:
        state.bg = BG_COLORS[code] ?? null
        break
      case code === 38:
        state.fg = parseTrueColor(codes, i + 1)
        i += 2
        break
      case code === 48:
        state.bg = parseTrueColor(codes, i + 1)
        i += 2
        break
    }
  }
}

function parseTrueColor(codes: number[], start: number): string | null {
  if (start + 2 < codes.length && codes[start] === 2) {
    const r = codes[start + 1]
    const g = codes[start + 2]
    const b = codes[start + 3]
    if (r !== undefined && g !== undefined && b !== undefined) {
      return `rgb(${r},${g},${b})`
    }
  }
  return null
}

function buildStyleTag(state: StyleState): string {
  const styles: string[] = []
  if (state.bold) styles.push('font-weight:bold')
  if (state.italic) styles.push('font-style:italic')
  if (state.underline) styles.push('text-decoration:underline')
  if (state.fg) styles.push(`color:${state.fg}`)
  if (state.bg) styles.push(`background-color:${state.bg}`)

  if (styles.length === 0) return ''
  return `<span style="${styles.join(';')}">`
}

export function stripAnsi(raw: string): string {
  return raw
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x1b]*\x1b\\/g, '')
}
