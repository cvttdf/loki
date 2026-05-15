export interface McpServerConfig {
  id: string
  name: string
  command: string // e.g. "npx"
  args: string[] // e.g. ["@modelcontextprotocol/server-filesystem"]
  enabled: boolean
}

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface McpResource {
  uri: string
  name: string
  mimeType?: string
}
