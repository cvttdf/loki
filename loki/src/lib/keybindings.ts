export interface KeyCombo {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

export type KeyBindingAction =
  | 'new-tab'
  | 'close-tab'
  | 'next-tab'
  | 'prev-tab'
  | 'clear-terminal'
  | 'toggle-chat'
  | 'open-settings'
  | 'cycle-theme'
  | 'increase-font'
  | 'decrease-font'
  | 'reset-font'
  | 'select-all-blocks'
  | 'copy-selected-blocks'
  | 'clear-block-selection'
  | 'block-search'
  | 'switch-model'

export interface KeyBindingDef {
  action: KeyBindingAction
  label: string
  combo: KeyCombo
}

export function isMac(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')
}

export function defaultKeyBindings(): KeyBindingDef[] {
  const mac = isMac()
  const ctrl = !mac
  const meta = mac

  return [
    { action: 'new-tab',       label: 'New tab',          combo: { key: 't', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'new-tab',       label: 'New terminal',     combo: { key: 'n', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'close-tab',     label: 'Close tab',        combo: { key: 'w', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'next-tab',      label: 'Next tab',         combo: { key: ']', ctrlKey: ctrl, metaKey: meta, shiftKey: true } },
    { action: 'prev-tab',      label: 'Previous tab',     combo: { key: '[', ctrlKey: ctrl, metaKey: meta, shiftKey: true } },
    { action: 'clear-terminal',label: 'Clear terminal',   combo: { key: 'k', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'toggle-chat',   label: 'Toggle AI chat',   combo: { key: 'd', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'open-settings', label: 'Open settings',    combo: { key: ',', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'cycle-theme',   label: 'Cycle theme',      combo: { key: 't', ctrlKey: ctrl, metaKey: meta, shiftKey: true } },
    { action: 'increase-font', label: 'Increase font size', combo: { key: '=', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'decrease-font', label: 'Decrease font size', combo: { key: '-', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'reset-font',    label: 'Reset font size',  combo: { key: '0', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'select-all-blocks',      label: 'Select all blocks', combo: { key: 'a', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
    { action: 'copy-selected-blocks',   label: 'Copy selected blocks', combo: { key: 'c', ctrlKey: ctrl, metaKey: meta, shiftKey: true } },
    { action: 'clear-block-selection',  label: 'Clear selection', combo: { key: 'Escape', ctrlKey: false, metaKey: false, shiftKey: false } },
    { action: 'switch-model',     label: 'Switch AI model', combo: { key: 'm', ctrlKey: ctrl, metaKey: meta, shiftKey: false } },
  ]
}

export function matchesKeyCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  return (
    event.key.toLowerCase() === combo.key.toLowerCase() &&
    event.ctrlKey === combo.ctrlKey &&
    event.metaKey === combo.metaKey &&
    event.shiftKey === combo.shiftKey
  )
}

export function formatKeyCombo(combo: KeyCombo): string {
  const parts: string[] = []
  if (combo.metaKey) parts.push('Cmd')
  if (combo.ctrlKey) parts.push('Ctrl')
  if (combo.shiftKey) parts.push('Shift')
  parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : combo.key)
  return parts.join('+')
}
