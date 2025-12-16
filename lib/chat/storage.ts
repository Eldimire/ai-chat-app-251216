export type ChatMessage = {
    role: 'user' | 'assistant'
    content: string
}

export type ChatSession = {
    id: string
    title: string
    createdAt: number
    updatedAt: number
}

const STORAGE_KEY_SESSIONS = 'chat:sessions'
const STORAGE_KEY_SESSION_PREFIX = 'chat:session:'
const LEGACY_STORAGE_KEY = 'chat:session:v1'

export class ChatStorage {
    static getSessions(): ChatSession[] {
        if (typeof window === 'undefined') return []
        
        // Migration check
        this.migrateLegacyData()

        try {
            const raw = localStorage.getItem(STORAGE_KEY_SESSIONS)
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    }

    static getSessionMessages(sessionId: string): ChatMessage[] {
        if (typeof window === 'undefined') return []
        
        try {
            const raw = localStorage.getItem(`${STORAGE_KEY_SESSION_PREFIX}${sessionId}`)
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    }

    static saveSessionMessages(sessionId: string, messages: ChatMessage[]) {
        if (typeof window === 'undefined') return
        
        try {
            localStorage.setItem(`${STORAGE_KEY_SESSION_PREFIX}${sessionId}`, JSON.stringify(messages))
            this.updateSessionTimestamp(sessionId)
        } catch (e) {
            console.error('Failed to save messages', e)
        }
    }

    static createSession(title?: string): ChatSession {
        const sessions = this.getSessions()
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: title || `새 채팅 ${new Date().toLocaleDateString()}`,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
        
        // Prepend to list (newest first)
        const updatedSessions = [newSession, ...sessions]
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updatedSessions))
        
        return newSession
    }

    static updateSessionTimestamp(sessionId: string) {
        const sessions = this.getSessions()
        const index = sessions.findIndex(s => s.id === sessionId)
        if (index !== -1) {
            sessions[index].updatedAt = Date.now()
            localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions))
        }
    }

    static deleteSession(sessionId: string) {
        if (typeof window === 'undefined') return
        
        const sessions = this.getSessions().filter(s => s.id !== sessionId)
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions))
        localStorage.removeItem(`${STORAGE_KEY_SESSION_PREFIX}${sessionId}`)
    }

    private static migrateLegacyData() {
        if (typeof window === 'undefined') return
        
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (legacyData) {
            try {
                // Check if already migrated (simple check: if sessions exist, assume handled or clean start)
                // But better: check if we haven't migrated this specific data? 
                // For simplicity: If sessions list is empty AND legacy data exists, migrate it.
                const sessions = this.getSessions()
                if (sessions.length === 0) {
                    const messages = JSON.parse(legacyData)
                    if (Array.isArray(messages) && messages.length > 0) {
                        const newSession = this.createSession('이전 대화')
                        this.saveSessionMessages(newSession.id, messages)
                    }
                }
                // Optional: Remove legacy key after migration? 
                // Leaving it for safety or clearing it to prevent re-migration if user clears sessions.
                // Let's clear it to be clean.
                localStorage.removeItem(LEGACY_STORAGE_KEY)
            } catch (e) {
                console.error('Migration failed', e)
            }
        }
    }
}

