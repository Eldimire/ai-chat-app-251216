import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

export interface ActiveConnection {
    client: Client
    transport: Transport
    serverId: string
}

// Global scope type definition to prevent TS errors
const globalForMCP = globalThis as unknown as {
    mcpConnections: Map<string, ActiveConnection>
}

// Initialize the global map if it doesn't exist
if (!globalForMCP.mcpConnections) {
    globalForMCP.mcpConnections = new Map()
}

export const GlobalMcpManager = {
    addConnection(serverId: string, client: Client, transport: Transport) {
        // Close existing connection if any
        if (globalForMCP.mcpConnections.has(serverId)) {
            const existing = globalForMCP.mcpConnections.get(serverId)
            try {
                existing?.client.close()
                existing?.transport.close()
            } catch (e) {
                console.error(`Error closing existing connection for ${serverId}:`, e)
            }
        }
        
        globalForMCP.mcpConnections.set(serverId, {
            client,
            transport,
            serverId
        })
    },

    getConnection(serverId: string): ActiveConnection | undefined {
        return globalForMCP.mcpConnections.get(serverId)
    },

    removeConnection(serverId: string) {
        const connection = globalForMCP.mcpConnections.get(serverId)
        if (connection) {
            try {
                connection.client.close()
                connection.transport.close()
            } catch (e) {
                console.error(`Error closing connection for ${serverId}:`, e)
            }
            globalForMCP.mcpConnections.delete(serverId)
        }
    },

    getAllConnections(): ActiveConnection[] {
        return Array.from(globalForMCP.mcpConnections.values())
    },

    clearAll() {
        for (const [id] of globalForMCP.mcpConnections) {
            this.removeConnection(id)
        }
    }
}
