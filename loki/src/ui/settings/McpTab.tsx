import React, { useState, useCallback } from 'react'
import { useMcpStore } from '@/store/mcp'
import { mcpClient } from '@/mcp/client'
import type { McpServerConfig } from '@/mcp/types'

export const McpTab: React.FC = () => {
  const [showMCPForm, setShowMCPForm] = useState(false)
  const [mcpForm, setMcpForm] = useState({ name: '', command: '', argsStr: '' })
  const [mcpConnecting, setMcpConnecting] = useState<string | null>(null)
  const [mcpError, setMcpError] = useState<string | null>(null)

  const {
    serverConfigs, connectedServers, serverTools,
    addServer, removeServer, setServerTools, setConnected,
  } = useMcpStore()

  const handleAddMcpServer = useCallback(async () => {
    if (!mcpForm.name.trim() || !mcpForm.command.trim()) return
    const id = `mcp-${Date.now()}`
    const args = mcpForm.argsStr.trim() ? mcpForm.argsStr.trim().split(/\s+/) : []
    const config: McpServerConfig = {
      id,
      name: mcpForm.name.trim(),
      command: mcpForm.command.trim(),
      args,
      enabled: false,
    }
    addServer(config)
    setMcpForm({ name: '', command: '', argsStr: '' })
    setShowMCPForm(false)
  }, [mcpForm, addServer])

  const handleConnectMcp = useCallback(async (config: McpServerConfig) => {
    setMcpConnecting(config.id)
    setMcpError(null)
    try {
      await mcpClient.startServer(config)
      setConnected(config.id, true)
      const tools = await mcpClient.listTools(config.id)
      setServerTools(config.id, tools)
    } catch (err) {
      setMcpError(err instanceof Error ? err.message : String(err))
    } finally {
      setMcpConnecting(null)
    }
  }, [setConnected, setServerTools])

  const handleDisconnectMcp = useCallback(async (id: string) => {
    try {
      await mcpClient.stopServer(id)
    } catch {
      // Server may already be dead
    }
    setConnected(id, false)
  }, [setConnected])

  const handleDeleteMcpServer = useCallback((id: string) => {
    if (connectedServers.includes(id)) {
      mcpClient.stopServer(id).catch(() => {})
    }
    removeServer(id)
  }, [connectedServers, removeServer])

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {mcpError && (
        <div className="p-2 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">
          {mcpError}
          <button className="ml-2 underline" onClick={() => setMcpError(null)}>Dismiss</button>
        </div>
      )}

      {showMCPForm ? (
        <div className="space-y-3 p-3 rounded-lg bg-loki-bg border border-loki-border">
          <div className="text-xs text-loki-fg/40 uppercase">Add MCP Server</div>
          <input
            type="text"
            placeholder="Name * (e.g. Filesystem)"
            value={mcpForm.name}
            onChange={e => setMcpForm({ ...mcpForm, name: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
          />
          <input
            type="text"
            placeholder="Command * (e.g. npx)"
            value={mcpForm.command}
            onChange={e => setMcpForm({ ...mcpForm, command: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
          />
          <input
            type="text"
            placeholder="Args (space-separated, e.g. -y @modelcontextprotocol/server-filesystem)"
            value={mcpForm.argsStr}
            onChange={e => setMcpForm({ ...mcpForm, argsStr: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddMcpServer}
              disabled={!mcpForm.name.trim() || !mcpForm.command.trim()}
              className="flex-1 px-3 py-1.5 text-sm bg-loki-accent text-white rounded hover:opacity-90 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setShowMCPForm(false); setMcpForm({ name: '', command: '', argsStr: '' }) }}
              className="px-3 py-1.5 text-sm bg-loki-bg text-loki-fg/60 border border-loki-border rounded hover:text-loki-fg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="w-full px-3 py-2 text-sm text-loki-fg/60 hover:text-loki-fg hover:bg-loki-bg rounded transition-colors"
          onClick={() => setShowMCPForm(true)}
        >
          + Add MCP Server
        </button>
      )}

      {/* Server list */}
      {serverConfigs.length === 0 && !showMCPForm && (
        <div className="text-xs text-loki-fg/30 text-center py-4">
          No MCP servers configured. Add one to extend AI capabilities.
        </div>
      )}

      <div className="space-y-3">
        {serverConfigs.map(config => {
          const isConnected = connectedServers.includes(config.id)
          const tools = serverTools[config.id] ?? []
          const isBusy = mcpConnecting === config.id

          return (
            <div
              key={config.id}
              className="p-3 rounded-lg bg-loki-bg border border-loki-border space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-loki-fg font-medium">{config.name}</div>
                  <div className="text-[10px] text-loki-fg/40 font-mono">
                    {config.command} {config.args.join(' ')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Connect/Disconnect toggle */}
                  <button
                    disabled={isBusy}
                    className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                      isConnected
                        ? 'border-loki-accent/50 text-loki-accent hover:bg-loki-accent/10'
                        : 'border-loki-fg/20 text-loki-fg/50 hover:border-loki-fg/40'
                    }`}
                    onClick={() => {
                      if (isConnected) {
                        handleDisconnectMcp(config.id)
                      } else {
                        handleConnectMcp(config)
                      }
                    }}
                  >
                    {isBusy ? '...' : isConnected ? 'Disconnect' : 'Connect'}
                  </button>
                  {/* Delete */}
                  <button
                    className="text-loki-fg/30 hover:text-loki-block-error text-sm"
                    onClick={() => handleDeleteMcpServer(config.id)}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Tools */}
              {isConnected && tools.length > 0 && (
                <div className="border-t border-loki-border/50 pt-2">
                  <div className="text-[10px] text-loki-fg/40 uppercase mb-1.5">
                    Tools ({tools.length})
                  </div>
                  <div className="space-y-1">
                    {tools.map(tool => (
                      <div key={tool.name} className="text-xs">
                        <span className="text-loki-fg/80 font-medium">{tool.name}</span>
                        {tool.description && (
                          <span className="text-loki-fg/40 ml-1">— {tool.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isConnected && tools.length === 0 && (
                <div className="text-[10px] text-loki-fg/30 pt-1">No tools discovered</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
