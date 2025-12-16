'use client'

import { useState } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    AlertCircle,
    CheckCircle,
    Edit,
    Trash2,
    Play,
    Square,
    Eye
} from 'lucide-react'
import { MCPServerConfig, ConnectedMCPServer } from '@/lib/types/mcp'

interface MCPServerListProps {
    servers: MCPServerConfig[]
    connectedServers: ConnectedMCPServer[]
    onEdit: (server: MCPServerConfig) => void
    onDelete: (serverId: string) => void
    onConnect: (server: MCPServerConfig) => void
    onDisconnect: (serverId: string) => void
    onViewDetails: (server: ConnectedMCPServer) => void
}

export function MCPServerList({
    servers,
    connectedServers,
    onEdit,
    onDelete,
    onConnect,
    onDisconnect,
    onViewDetails
}: MCPServerListProps) {
    const [loadingServers, setLoadingServers] = useState<Set<string>>(new Set())

    const getConnectedServer = (
        serverId: string
    ): ConnectedMCPServer | null => {
        return connectedServers.find(cs => cs.config.id === serverId) || null
    }

    const handleConnect = async (server: MCPServerConfig) => {
        setLoadingServers(prev => new Set(prev).add(server.id))
        try {
            await onConnect(server)
        } finally {
            setLoadingServers(prev => {
                const newSet = new Set(prev)
                newSet.delete(server.id)
                return newSet
            })
        }
    }

    const handleDisconnect = async (serverId: string) => {
        setLoadingServers(prev => new Set(prev).add(serverId))
        try {
            await onDisconnect(serverId)
        } finally {
            setLoadingServers(prev => {
                const newSet = new Set(prev)
                newSet.delete(serverId)
                return newSet
            })
        }
    }

    if (servers.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                등록된 MCP 서버가 없습니다.
                <br />새 서버를 추가해보세요.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {servers.map(server => {
                const connectedServer = getConnectedServer(server.id)
                const isConnected = connectedServer?.isConnected || false
                const isServerLoading = loadingServers.has(server.id)

                return (
                    <Card key={server.id} className="w-full">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {server.name}
                                        {isConnected ? (
                                            <Badge
                                                variant="default"
                                                className="bg-green-500"
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                연결됨
                                            </Badge>
                                        ) : connectedServer?.lastError ? (
                                            <Badge variant="destructive">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                오류
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                연결 안됨
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        {server.description || '설명 없음'}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isConnected ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    onViewDetails(
                                                        connectedServer!
                                                    )
                                                }
                                                disabled={isServerLoading}
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                상세
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleDisconnect(server.id)
                                                }
                                                disabled={isServerLoading}
                                            >
                                                <Square className="w-4 h-4 mr-1" />
                                                {isServerLoading
                                                    ? '연결 해제 중...'
                                                    : '연결 해제'}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleConnect(server)
                                            }
                                            disabled={isServerLoading}
                                        >
                                            <Play className="w-4 h-4 mr-1" />
                                            {isServerLoading
                                                ? '연결 중...'
                                                : '연결'}
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(server)}
                                        disabled={isServerLoading}
                                    >
                                        <Edit className="w-4 h-4 mr-1" />
                                        수정
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDelete(server.id)}
                                        disabled={
                                            isServerLoading || isConnected
                                        }
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        삭제
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">
                                        전송 방식:
                                    </span>{' '}
                                    {server.transport.toUpperCase()}
                                </div>
                                <div>
                                    <span className="font-medium">생성일:</span>{' '}
                                    {new Date(
                                        server.createdAt
                                    ).toLocaleDateString()}
                                </div>
                                {server.transport === 'stdio' &&
                                    server.command && (
                                        <div className="col-span-2">
                                            <span className="font-medium">
                                                명령어:
                                            </span>{' '}
                                            {server.command}{' '}
                                            {server.args?.join(' ')}
                                        </div>
                                    )}
                                {(server.transport === 'http' ||
                                    server.transport === 'sse') &&
                                    server.url && (
                                        <div className="col-span-2">
                                            <span className="font-medium">
                                                URL:
                                            </span>{' '}
                                            {server.url}
                                        </div>
                                    )}
                                {connectedServer?.lastError && (
                                    <div className="col-span-2 text-red-600 text-sm">
                                        <span className="font-medium">
                                            오류:
                                        </span>{' '}
                                        {connectedServer.lastError}
                                    </div>
                                )}
                                {isConnected && connectedServer && (
                                    <div className="col-span-2 grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center p-2 bg-blue-50 rounded">
                                            <div className="font-medium">
                                                도구
                                            </div>
                                            <div className="text-lg">
                                                {connectedServer.tools.length}
                                            </div>
                                        </div>
                                        <div className="text-center p-2 bg-green-50 rounded">
                                            <div className="font-medium">
                                                프롬프트
                                            </div>
                                            <div className="text-lg">
                                                {connectedServer.prompts.length}
                                            </div>
                                        </div>
                                        <div className="text-center p-2 bg-purple-50 rounded">
                                            <div className="font-medium">
                                                리소스
                                            </div>
                                            <div className="text-lg">
                                                {
                                                    connectedServer.resources
                                                        .length
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
