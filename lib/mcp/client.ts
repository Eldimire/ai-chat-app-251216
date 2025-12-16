// 클라이언트에서 서버 액션을 호출하는 래퍼 클래스
import {
    connectToMCPServer,
    disconnectFromMCPServer,
    callMCPTool,
    getMCPPromptResult,
    readMCPResource,
    getConnectedServerIds,
    isServerConnected
} from '@/lib/actions/mcp-actions'
import {
    MCPServerConfig,
    ConnectedMCPServer,
    MCPToolCall,
    MCPToolResult
} from '@/lib/types/mcp'

export class MCPClientManager {
    async connectServer(config: MCPServerConfig): Promise<ConnectedMCPServer> {
        return await connectToMCPServer(config)
    }

    async disconnectServer(serverId: string): Promise<void> {
        await disconnectFromMCPServer(serverId)
    }

    async callTool(
        serverId: string,
        toolCall: MCPToolCall
    ): Promise<MCPToolResult> {
        return await callMCPTool(serverId, toolCall)
    }

    async getPromptResult(
        serverId: string,
        promptName: string,
        arguments_?: Record<string, unknown>
    ): Promise<MCPToolResult> {
        return await getMCPPromptResult(serverId, promptName, arguments_)
    }

    async readResource(serverId: string, uri: string): Promise<MCPToolResult> {
        return await readMCPResource(serverId, uri)
    }

    async isConnected(serverId: string): Promise<boolean> {
        return await isServerConnected(serverId)
    }

    async getConnectedServerIds(): Promise<string[]> {
        return await getConnectedServerIds()
    }

    async disconnectAll(): Promise<void> {
        const serverIds = await this.getConnectedServerIds()
        const disconnectPromises = serverIds.map(serverId =>
            this.disconnectServer(serverId)
        )
        await Promise.all(disconnectPromises)
    }
}

// 싱글톤 인스턴스
export const mcpClientManager = new MCPClientManager()
