import type { PluginManifest, LokiPlugin, PluginContext, Disposable } from './types'
import { createPluginStorage } from './storage'
import { eventBus } from './events'
import { usePluginStore } from '@/store/plugins'

interface LoadedPlugin {
  manifest: PluginManifest
  instance: LokiPlugin
  context: PluginContext
  disposables: Disposable[]
}

class PluginLoader {
  private plugins = new Map<string, LoadedPlugin>()

  async load(manifest: PluginManifest, plugin: LokiPlugin): Promise<void> {
    if (this.plugins.has(manifest.id)) {
      console.warn(`[PluginLoader] Plugin "${manifest.id}" is already loaded`)
      return
    }

    const disposables: Disposable[] = []

    const ctx: PluginContext = {
      id: manifest.id,
      storage: createPluginStorage(manifest.id),
      on: (event, handler) => {
        const d = eventBus.on(event, handler)
        disposables.push(d)
        return d
      },
      emit: (event, data) => eventBus.emit(event, data),
      logger: {
        info: (msg) => console.log(`[${manifest.id}]`, msg),
        warn: (msg) => console.warn(`[${manifest.id}]`, msg),
        error: (msg) => console.error(`[${manifest.id}]`, msg),
      },
      commands: {
        register: (id, handler) => {
          const d = eventBus.on(`command:${id}`, () => { void handler() })
          disposables.push(d)
          return d
        },
      },
    }

    // Register command contributions
    if (manifest.contributes?.commands) {
      for (const cmd of manifest.contributes.commands) {
        usePluginStore.getState().registerCommand(cmd)
      }
    }

    await plugin.activate(ctx)

    this.plugins.set(manifest.id, {
      manifest,
      instance: plugin,
      context: ctx,
      disposables,
    })

    eventBus.emit('plugin:loaded', manifest)
    ctx.logger.info('Plugin loaded')
  }

  async unload(id: string): Promise<void> {
    const entry = this.plugins.get(id)
    if (!entry) return

    await entry.instance.deactivate()

    for (const d of entry.disposables) {
      d.dispose()
    }

    this.plugins.delete(id)
    eventBus.emit('plugin:unloaded', entry.manifest)
  }

  async unloadAll(): Promise<void> {
    const ids = Array.from(this.plugins.keys())
    for (const id of ids) {
      await this.unload(id)
    }
  }

  getLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values())
  }

  isLoaded(id: string): boolean {
    return this.plugins.has(id)
  }

  executeCommand(commandId: string): Promise<void> {
    const listeners = eventBus['listeners']?.get(`command:${commandId}`)
    if (listeners && listeners.size > 0) {
      eventBus.emit(`command:${commandId}`)
    }
    return Promise.resolve()
  }
}

export const pluginLoader = new PluginLoader()
export type { LoadedPlugin }
