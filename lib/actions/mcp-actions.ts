'use server'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
    MCPServerConfig,
    ConnectedMCPServer,
    MCPToolCall,
    MCPToolResult,
    MCPTool,
    MCPPrompt,
    MCPResource
} from '@/lib/types/mcp'
import { GlobalMcpManager } from '@/lib/mcp/global-manager'

export async function connectToMCPServer(
    config: MCPServerConfig
): Promise<ConnectedMCPServer> {
    try {
        // 이미 연결된 클라이언트가 있다면 해제
        await disconnectFromMCPServer(config.id)

        const client = new Client(
            {
                name: 'ai-chat-server',
                version: '1.0.0'
            },
            {
                capabilities: {
                    tools: {},
                    prompts: {},
                    resources: {
                        subscribe: true,
                        listChanged: true
                    }
                }
            }
        )

        let transport: Transport

        switch (config.transport) {
            case 'stdio':
                if (!config.command) {
                    throw new Error('STDIO 전송 방식에는 command가 필요합니다')
                }
                transport = new StdioClientTransport({
                    command: config.command,
                    args: config.args || [],
                    env: config.env || {}
                })
                break

            case 'sse':
                if (!config.url) {
                    throw new Error('SSE 전송 방식에는 URL이 필요합니다')
                }
                transport = new SSEClientTransport(new URL(config.url))
                break

            case 'http':
                if (!config.url) {
                    throw new Error('HTTP 전송 방식에는 URL이 필요합니다')
                }
                transport = new StreamableHTTPClientTransport(
                    new URL(config.url),
                    {
                        requestInit: config.headers
                            ? {
                                  headers: config.headers
                              }
                            : undefined
                    }
                )
                break

            default:
                throw new Error(`지원되지 않는 전송 방식: ${config.transport}`)
        }

        await client.connect(transport)

        // 클라이언트와 전송 객체를 전역 매니저에 저장
        GlobalMcpManager.addConnection(config.id, client, transport)

        // 서버 정보 및 기능 조회
        const [toolsResult, promptsResult, resourcesResult] =
            await Promise.allSettled([
                client.listTools(),
                client.listPrompts(),
                client.listResources()
            ])

        const tools =
            toolsResult.status === 'fulfilled'
                ? (toolsResult.value.tools as MCPTool[]) || []
                : []
        const prompts =
            promptsResult.status === 'fulfilled'
                ? (promptsResult.value.prompts as MCPPrompt[]) || []
                : []
        const resources =
            resourcesResult.status === 'fulfilled'
                ? (resourcesResult.value.resources as MCPResource[]) || []
                : []

        return {
            config,
            info: {
                name: 'MCP Server',
                version: '1.0.0',
                capabilities: {}
            },
            tools,
            prompts,
            resources,
            isConnected: true
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : '알 수 없는 오류가 발생했습니다'

        return {
            config,
            info: {
                name: 'Unknown',
                version: 'Unknown',
                capabilities: {}
            },
            tools: [],
            prompts: [],
            resources: [],
            isConnected: false,
            lastError: errorMessage
        }
    }
}

export async function disconnectFromMCPServer(serverId: string): Promise<void> {
    GlobalMcpManager.removeConnection(serverId)
}

export async function callMCPTool(
    serverId: string,
    toolCall: MCPToolCall
): Promise<MCPToolResult> {
    const connection = GlobalMcpManager.getConnection(serverId)

    if (!connection) {
        throw new Error('서버에 연결되지 않았습니다')
    }

    try {
        const result = await connection.client.callTool({
            name: toolCall.name,
            arguments: toolCall.arguments
        })

        const content = Array.isArray(result.content) ? result.content : []
        return {
            content: content.map((item: unknown) => ({
                type: 'text' as const,
                text: typeof item === 'string' ? item : JSON.stringify(item)
            })),
            isError: Boolean(result.isError)
        }
    } catch (error) {
        throw new Error(
            `도구 호출 실패: ${
                error instanceof Error ? error.message : '알 수 없는 오류'
            }`
        )
    }
}

export async function getMCPPromptResult(
    serverId: string,
    promptName: string,
    arguments_: Record<string, unknown> = {}
): Promise<MCPToolResult> {
    const connection = GlobalMcpManager.getConnection(serverId)

    if (!connection) {
        throw new Error('서버에 연결되지 않았습니다')
    }

    try {
        const result = await connection.client.getPrompt({
            name: promptName,
            arguments: Object.fromEntries(
                Object.entries(arguments_).map(([k, v]) => [k, String(v)])
            )
        })

        return {
            content:
                result.messages?.map(msg => ({
                    type: 'text' as const,
                    text:
                        typeof msg.content === 'string'
                            ? msg.content
                            : JSON.stringify(msg.content)
                })) || [],
            isError: false
        }
    } catch (error) {
        throw new Error(
            `프롬프트 실행 실패: ${
                error instanceof Error ? error.message : '알 수 없는 오류'
            }`
        )
    }
}

export async function readMCPResource(
    serverId: string,
    uri: string
): Promise<MCPToolResult> {
    const connection = GlobalMcpManager.getConnection(serverId)

    if (!connection) {
        throw new Error('서버에 연결되지 않았습니다')
    }

    try {
        const result = await connection.client.readResource({ uri })

        return {
            content: (result.contents || []).map((item: unknown) => ({
                type: 'text' as const,
                text: typeof item === 'string' ? item : JSON.stringify(item)
            })),
            isError: false
        }
    } catch (error) {
        throw new Error(
            `리소스 읽기 실패: ${
                error instanceof Error ? error.message : '알 수 없는 오류'
            }`
        )
    }
}

export async function getConnectedServerIds(): Promise<string[]> {
    return GlobalMcpManager.getAllConnections().map(c => c.serverId)
}

export async function isServerConnected(serverId: string): Promise<boolean> {
    return !!GlobalMcpManager.getConnection(serverId)
}

export async function getConnectedServerInfo(
    serverId: string
): Promise<ConnectedMCPServer | null> {
    const connection = GlobalMcpManager.getConnection(serverId)
    if (!connection) {
        return null
    }

    // 연결이 살아있는지 확인하기 위해 간단한 요청 시도
    try {
        const [toolsResult, promptsResult, resourcesResult] =
            await Promise.allSettled([
                connection.client.listTools(),
                connection.client.listPrompts(),
                connection.client.listResources()
            ])

        const tools =
            toolsResult.status === 'fulfilled'
                ? (toolsResult.value.tools as MCPTool[]) || []
                : []
        const prompts =
            promptsResult.status === 'fulfilled'
                ? (promptsResult.value.prompts as MCPPrompt[]) || []
                : []
        const resources =
            resourcesResult.status === 'fulfilled'
                ? (resourcesResult.value.resources as MCPResource[]) || []
                : []

        // 저장된 설정을 가져오기 위해 임시로 빈 설정 반환 (실제로는 저장소에서 가져와야 함)
        return {
            config: {
                id: serverId,
                name: 'Connected Server',
                transport: 'stdio' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            },
            info: {
                name: 'MCP Server',
                version: '1.0.0',
                capabilities: {}
            },
            tools,
            prompts,
            resources,
            isConnected: true
        }
    } catch {
        // 연결이 끊어진 경우 정리
        GlobalMcpManager.removeConnection(serverId)
        return null
    }
}
