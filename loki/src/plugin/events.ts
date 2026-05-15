import type { Disposable } from './types'

type Handler = (...args: unknown[]) => void

class EventBus {
  private listeners = new Map<string, Set<Handler>>()

  on(event: string, handler: Handler): Disposable {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    return {
      dispose: () => this.off(event, handler),
    }
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler)
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((h) => h(...args))
  }

  once(event: string, handler: Handler): Disposable {
    const wrapper: Handler = (...args) => {
      this.off(event, wrapper)
      handler(...args)
    }
    return this.on(event, wrapper)
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}

export const eventBus = new EventBus()
