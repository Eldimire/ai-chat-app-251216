export type MCPTransportType = 'stdio' | 'http' | 'sse'

export interface MCPServerConfig {
    id: string
    name: string
    description?: string
    transport: MCPTransportType

    // STDIO 전용
    command?: string
    args?: string[]
    env?: Record<string, string>

    // HTTP/SSE 전용
    url?: string
    headers?: Record<string, string>

    // 메타데이터
    createdAt: string
    updatedAt: string
    isActive: boolean
}

export interface MCPTool {
    name: string
    description?: string
    inputSchema: {
        type: string
        properties?: Record<
            string,
            {
                type: string
                description?: string
                enum?: string[]
                default?: unknown
            }
        >
        required?: string[]
    }
}

export interface MCPPrompt {
    name: string
    description?: string
    arguments?: Array<{
        name: string
        description?: string
        required?: boolean
    }>
}

export interface MCPResource {
    uri: string
    name?: string
    description?: string
    mimeType?: string
}

export interface MCPServerCapabilities {
    tools?: {
        listChanged?: boolean
    }
    prompts?: {
        listChanged?: boolean
    }
    resources?: {
        subscribe?: boolean
        listChanged?: boolean
    }
    logging?: object
}

export interface MCPServerInfo {
    name: string
    version: string
    capabilities: MCPServerCapabilities
}

export interface ConnectedMCPServer {
    config: MCPServerConfig
    info: MCPServerInfo
    tools: MCPTool[]
    prompts: MCPPrompt[]
    resources: MCPResource[]
    isConnected: boolean
    lastError?: string
}

export interface MCPClientError {
    code: string
    message: string
    details?: unknown
}

export interface MCPToolCall {
    name: string
    arguments: Record<string, unknown>
}

export interface MCPToolResult {
    content: Array<{
        type: 'text' | 'image' | 'resource'
        text?: string
        data?: string
        url?: string
        mimeType?: string
    }>
    isError?: boolean
}
