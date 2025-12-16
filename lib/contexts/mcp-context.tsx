'use client'

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode
} from 'react'
import { ConnectedMCPServer } from '@/lib/types/mcp'
import {
    getConnectedServerIds,
    getConnectedServerInfo
} from '@/lib/actions/mcp-actions'
import { MCPServerStorage } from '@/lib/mcp/storage'

interface MCPContextType {
    connectedServers: ConnectedMCPServer[]
    setConnectedServers: (servers: ConnectedMCPServer[]) => void
    refreshConnections: () => Promise<void>
}

const MCPContext = createContext<MCPContextType | undefined>(undefined)

export function MCPProvider({ children }: { children: ReactNode }) {
    const [connectedServers, setConnectedServers] = useState<
        ConnectedMCPServer[]
    >([])

    const refreshConnections = useCallback(async () => {
        try {
            const connectedIds = await getConnectedServerIds()
            const connectedServersPromises = connectedIds.map(
                async serverId => {
                    const serverInfo = await getConnectedServerInfo(serverId)
                    if (serverInfo) {
                        const actualConfig =
                            MCPServerStorage.getServer(serverId)
                        if (actualConfig) {
                            return {
                                ...serverInfo,
                                config: actualConfig
                            }
                        }
                    }
                    return null
                }
            )

            const validConnectedServers = (
                await Promise.all(connectedServersPromises)
            ).filter((server): server is ConnectedMCPServer => server !== null)

            setConnectedServers(validConnectedServers)
        } catch (error) {
            console.error('MCP 연결 상태 새로고침 오류:', error)
        }
    }, [])

    useEffect(() => {
        refreshConnections()
    }, [refreshConnections])

    return (
        <MCPContext.Provider
            value={{
                connectedServers,
                setConnectedServers,
                refreshConnections
            }}
        >
            {children}
        </MCPContext.Provider>
    )
}

export function useMCP() {
    const context = useContext(MCPContext)
    if (context === undefined) {
        throw new Error('useMCP must be used within a MCPProvider')
    }
    return context
}
