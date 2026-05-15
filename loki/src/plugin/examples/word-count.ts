import type { LokiPlugin, PluginContext, PluginManifest } from '../types'

let ctx: PluginContext | null = null

const plugin: LokiPlugin = {
  activate(context: PluginContext) {
    ctx = context

    context.commands.register('word-count', () => {
      context.emit('terminal:read', null)
      context.logger.info('word-count command executed — listening for terminal data')
    })

    context.on('terminal:command-end', (_data) => {
      context.logger.info('A terminal command completed — word-count is watching')
    })

    context.on('terminal:block-content', (data) => {
      const text = typeof data === 'string' ? data : ''
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length
      const charCount = text.length
      context.logger.info(`Word count: ${wordCount} words, ${charCount} characters`)
    })

    context.logger.info('Word Count plugin activated — run "word-count" to count words in terminal output')
  },

  deactivate() {
    ctx?.logger.info('Word Count plugin deactivated')
    ctx = null
  },
}

export default plugin
export const manifest: PluginManifest = {
  id: 'word-count',
  name: 'Word Count',
  version: '1.0.0',
  description: 'Counts words and characters in terminal output',
  author: 'Loki Team',
  main: 'word-count.js',
  capabilities: ['command:register', 'terminal:read'],
  contributes: {
    commands: [{ id: 'word-count', title: 'Count Words in Last Block' }],
  },
}
