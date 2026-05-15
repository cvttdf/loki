import { invoke } from '@tauri-apps/api/core'
import type { McpServerConfig, McpTool } from './types'

class McpClientManager {
  private servers = new Map<string, McpServerConfig>()

  async startServer(config: McpServerConfig): Promise<void> {
    await invoke('mcp_start_server', {
      id: config.id,
      command: config.command,
      args: config.args,
    })
    await this.initializeServer(config.id)
    this.servers.set(config.id, config)
  }

  async stopServer(id: string): Promise<void> {
    await invoke('mcp_stop_server', { id })
    this.servers.delete(id)
  }

  async listServers(): Promise<string[]> {
    return invoke('mcp_list_servers')
  }

  async sendRequest(
    serverId: string,
    method: string,
    params: Record<string, unknown> | null,
  ): Promise<unknown> {
    return invoke('mcp_send_request', { serverId, method, params })
  }

  async listTools(serverId: string): Promise<McpTool[]> {
    const result = await invoke('mcp_send_request', {
      serverId,
      method: 'tools/list',
      params: null,
    })
    const data = result as { tools: McpTool[] }
    return data.tools ?? []
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    return invoke('mcp_send_request', {
      serverId,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    })
  }

  getConnectedServers(): McpServerConfig[] {
    return Array.from(this.servers.values())
  }

  private async initializeServer(id: string): Promise<void> {
    // Send initialize request per MCP spec
    const initResult = await invoke('mcp_send_request', {
      serverId: id,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'loki',
          version: '0.1.0',
        },
      },
    }) as { protocolVersion?: string; serverInfo?: unknown; capabilities?: unknown }

    // Send initialized notification (not a request, no response needed)
    // We skip this for MVP since send_request expects a response
    // In a full implementation, we'd use a fire-and-forget notification method
  }
}

export const mcpClient = new McpClientManager()
