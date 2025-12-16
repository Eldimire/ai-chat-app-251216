import { MCPServerConfig } from '@/lib/types/mcp'

const MCP_SERVERS_KEY = 'mcp_servers'

export class MCPServerStorage {
    static getAllServers(): MCPServerConfig[] {
        if (typeof window === 'undefined') return []

        try {
            const stored = localStorage.getItem(MCP_SERVERS_KEY)
            return stored ? JSON.parse(stored) : []
        } catch (error) {
            console.error(
                'Failed to load MCP servers from localStorage:',
                error
            )
            return []
        }
    }

    static saveServer(server: MCPServerConfig): void {
        if (typeof window === 'undefined') return

        try {
            const servers = this.getAllServers()
            const existingIndex = servers.findIndex(s => s.id === server.id)

            if (existingIndex >= 0) {
                servers[existingIndex] = {
                    ...server,
                    updatedAt: new Date().toISOString()
                }
            } else {
                servers.push(server)
            }

            localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers))
        } catch (error) {
            console.error('Failed to save MCP server to localStorage:', error)
            throw new Error('서버 정보 저장에 실패했습니다')
        }
    }

    static deleteServer(id: string): void {
        if (typeof window === 'undefined') return

        try {
            const servers = this.getAllServers().filter(s => s.id !== id)
            localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers))
        } catch (error) {
            console.error(
                'Failed to delete MCP server from localStorage:',
                error
            )
            throw new Error('서버 삭제에 실패했습니다')
        }
    }

    static getServer(id: string): MCPServerConfig | null {
        const servers = this.getAllServers()
        return servers.find(s => s.id === id) || null
    }

    static updateServerStatus(id: string, isActive: boolean): void {
        if (typeof window === 'undefined') return

        try {
            const servers = this.getAllServers()
            const serverIndex = servers.findIndex(s => s.id === id)

            if (serverIndex >= 0) {
                servers[serverIndex].isActive = isActive
                servers[serverIndex].updatedAt = new Date().toISOString()
                localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers))
            }
        } catch (error) {
            console.error('Failed to update server status:', error)
        }
    }

    static exportServers(): string {
        return JSON.stringify(this.getAllServers(), null, 2)
    }

    static importServers(data: string): void {
        if (typeof window === 'undefined') return

        try {
            const servers = JSON.parse(data) as MCPServerConfig[]

            // 기본 유효성 검사
            if (!Array.isArray(servers)) {
                throw new Error('올바르지 않은 데이터 형식입니다')
            }

            // 기존 서버들과 병합 (ID 중복 시 덮어쓰기)
            const existingServers = this.getAllServers()
            const mergedServers = [...existingServers]

            servers.forEach(newServer => {
                if (newServer.id && newServer.name && newServer.transport) {
                    const existingIndex = mergedServers.findIndex(
                        s => s.id === newServer.id
                    )
                    if (existingIndex >= 0) {
                        mergedServers[existingIndex] = {
                            ...newServer,
                            updatedAt: new Date().toISOString()
                        }
                    } else {
                        mergedServers.push({
                            ...newServer,
                            updatedAt: new Date().toISOString()
                        })
                    }
                }
            })

            localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(mergedServers))
        } catch (error) {
            console.error('Failed to import MCP servers:', error)
            throw new Error('서버 목록 가져오기에 실패했습니다')
        }
    }
}
