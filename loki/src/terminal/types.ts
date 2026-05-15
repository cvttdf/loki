import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import type { WebglAddon } from '@xterm/addon-webgl'
import type { TerminalThemeColors } from '@/theme/types'
import type { ShellIntegration } from './shell-integration'
import type { BlockManager } from './block-manager'
import type { ErrorAnalyzer } from '@/ai/error-analyzer'
import type { CommandSuggester } from '@/ai/command-suggester'
import type { ContextCollector } from '@/ai/context-collector'

export type TerminalTheme = TerminalThemeColors

export interface TerminalOptions {
  fontSize?: number
  fontFamily?: string
  theme?: TerminalTheme
  cursorBlink?: boolean
  cursorStyle?: 'block' | 'underline' | 'bar'
  scrollback?: number
}

export interface TerminalInstance {
  id: string
  ptyId: string | null
  xterm: Terminal
  fitAddon: FitAddon
  webglAddon: WebglAddon | null
  shellIntegration: ShellIntegration | null
  blockManager: BlockManager
  errorAnalyzer: ErrorAnalyzer
  suggester: CommandSuggester | null
  contextCollector: ContextCollector | null
  isActive: boolean
}

