export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  main: string
  capabilities: PluginCapability[]
  contributes?: {
    commands?: CommandContribution[]
    themes?: ThemeContribution[]
  }
}

export type PluginCapability =
  | 'terminal:read'
  | 'terminal:decorate'
  | 'ai:chat'
  | 'ui:register-panel'
  | 'command:register'
  | 'theme:register'

export interface CommandContribution {
  id: string
  title: string
  keybinding?: string
}

export interface ThemeContribution {
  id: string
  name: string
  path: string
}

export interface PluginContext {
  id: string
  storage: PluginStorage
  on: (event: string, handler: (...args: unknown[]) => void) => Disposable
  emit: (event: string, data: unknown) => void
  logger: PluginLogger
  commands: {
    register: (id: string, handler: () => void | Promise<void>) => Disposable
  }
}

export interface PluginStorage {
  get: <T>(key: string) => T | undefined
  set: <T>(key: string, value: T) => void
  delete: (key: string) => void
}

export interface PluginLogger {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export interface LokiPlugin {
  activate: (ctx: PluginContext) => void | Promise<void>
  deactivate: () => void | Promise<void>
}

export interface Disposable {
  dispose: () => void
}
