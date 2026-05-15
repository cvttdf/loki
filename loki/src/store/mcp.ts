import { create } from 'zustand'
import type { McpServerConfig, McpTool } from '@/mcp/types'

interface McpState {
  serverConfigs: McpServerConfig[]
  connectedServers: string[] // IDs of running servers
  serverTools: Record<string, McpTool[]> // tools per server, keyed by server ID

  addServer: (config: McpServerConfig) => void
  removeServer: (id: string) => void
  toggleServer: (id: string) => void
  setServerTools: (serverId: string, tools: McpTool[]) => void
  setConnected: (serverId: string, connected: boolean) => void
}

const MCP_KEY = 'loki-mcp-configs'

function loadConfigs(): McpServerConfig[] {
  try {
    const raw = localStorage.getItem(MCP_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function persist(configs: McpServerConfig[]): void {
  localStorage.setItem(MCP_KEY, JSON.stringify(configs))
}

export const useMcpStore = create<McpState>((set, get) => ({
  serverConfigs: loadConfigs(),
  connectedServers: [],
  serverTools: {},

  addServer: (config: McpServerConfig) => {
    const configs = [...get().serverConfigs, config]
    set({ serverConfigs: configs })
    persist(configs)
  },

  removeServer: (id: string) => {
    const configs = get().serverConfigs.filter((s) => s.id !== id)
    const connected = get().connectedServers.filter((s) => s !== id)
    const tools = { ...get().serverTools }
    delete tools[id]
    set({ serverConfigs: configs, connectedServers: connected, serverTools: tools })
    persist(configs)
  },

  toggleServer: (id: string) => {
    set((state) => {
      const configs = state.serverConfigs.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s,
      )
      persist(configs)
      return { serverConfigs: configs }
    })
  },

  setServerTools: (serverId: string, tools: McpTool[]) => {
    set((state) => ({
      serverTools: { ...state.serverTools, [serverId]: tools },
    }))
  },

  setConnected: (serverId: string, connected: boolean) => {
    set((state) => {
      const connectedServers = connected
        ? [...new Set([...state.connectedServers, serverId])]
        : state.connectedServers.filter((s) => s !== serverId)
      return { connectedServers }
    })
  },
}))
