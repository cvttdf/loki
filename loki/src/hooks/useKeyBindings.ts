import { useEffect } from 'react'
import { defaultKeyBindings, matchesKeyCombo, type KeyBindingAction } from '@/lib/keybindings'
import { useConfigStore } from '@/store/config'

export type KeyBindingHandlers = Partial<Record<KeyBindingAction, () => void>>

function isTerminalFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  return el.tagName === 'TEXTAREA' && el.classList.contains('xterm-helper-textarea')
}

function isBlockAreaFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  return el.closest('.block-list') !== null || el.closest('.block-container') !== null
}

/** Actions that should NOT be intercepted when the terminal is focused */
const TERMINAL_PASSTHROUGH: ReadonlySet<KeyBindingAction> = new Set([
  'select-all-blocks',
  'clear-block-selection',
  'block-search',
])

export function useKeyBindings(handlers: KeyBindingHandlers): void {
  useEffect(() => {
    const bindings = defaultKeyBindings()

    function resolveAction(event: KeyboardEvent): KeyBindingAction | null {
      const customBindings = useConfigStore.getState().keybindings
      for (const { action, combo } of bindings) {
        const override = customBindings[action]
        if (override && matchesKeyCombo(event, override)) return action
        if (!override && matchesKeyCombo(event, combo)) return action
      }
      return null
    }

    function onKeyDown(event: KeyboardEvent) {
      const action = resolveAction(event)
      if (!action || !handlers[action]) return

      // Block-area actions only fire when terminal is NOT focused
      if (isTerminalFocused() && TERMINAL_PASSTHROUGH.has(action)) return

      // When terminal is focused, only intercept Cmd/Ctrl combos
      if (isTerminalFocused() && !event.metaKey && !event.ctrlKey) return

      // Block-selection actions only fire when block area is focused
      if (action === 'select-all-blocks' && !isBlockAreaFocused()) return
      if (action === 'clear-block-selection' && !isBlockAreaFocused()) return
      if (action === 'block-search' && !isBlockAreaFocused()) return

      event.preventDefault()
      event.stopPropagation()
      handlers[action]!()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [handlers])
}
