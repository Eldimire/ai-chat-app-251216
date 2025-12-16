'use client'

import { useEffect, useState, useCallback } from 'react'
import { MCPManager } from '@/components/mcp/mcp-manager'
import { MCPProvider } from '@/lib/contexts/mcp-context'
import { Button } from '@/components/ui/button'
import { MessageSquare, Settings, Menu } from 'lucide-react'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatWindow } from '@/components/chat/chat-window'
import { ChatStorage, type ChatSession } from '@/lib/chat/storage'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export default function Home() {
    const [currentTab, setCurrentTab] = useState<'chat' | 'mcp'>('chat')
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Initial load
    useEffect(() => {
        const loadedSessions = ChatStorage.getSessions()
        setSessions(loadedSessions)
        
        if (loadedSessions.length > 0) {
            // Select most recent or first
            setCurrentSessionId(loadedSessions[0].id)
        } else {
            // Create default session if none exist
            const newSession = ChatStorage.createSession()
            setSessions([newSession])
            setCurrentSessionId(newSession.id)
        }
    }, [])

    const handleCreateSession = useCallback(() => {
        const newSession = ChatStorage.createSession()
        setSessions(prev => [newSession, ...prev])
        setCurrentSessionId(newSession.id)
        setIsMobileMenuOpen(false)
    }, [])

    const handleDeleteSession = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('정말 이 채팅방을 삭제하시겠습니까?')) return

        ChatStorage.deleteSession(id)
        setSessions(prev => {
            const next = prev.filter(s => s.id !== id)
            if (currentSessionId === id) {
                // If deleted current session, select first available or create new
                if (next.length > 0) {
                    setCurrentSessionId(next[0].id)
                } else {
                    const newSession = ChatStorage.createSession()
                    next.push(newSession)
                    setCurrentSessionId(newSession.id)
                }
            }
            return next
        })
    }, [currentSessionId])

    const handleSelectSession = useCallback((id: string) => {
        setCurrentSessionId(id)
        setIsMobileMenuOpen(false)
    }, [])

    return (
        <MCPProvider>
            <div className="flex h-screen overflow-hidden flex-col">
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                         {/* Mobile Sidebar Trigger */}
                        <div className="md:hidden">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Menu className="w-5 h-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-72">
                                    <ChatSidebar
                                        sessions={sessions}
                                        currentSessionId={currentSessionId}
                                        onSelectSession={handleSelectSession}
                                        onCreateSession={handleCreateSession}
                                        onDeleteSession={handleDeleteSession}
                                    />
                                </SheetContent>
                            </Sheet>
                        </div>
                        <h1 className="text-xl font-semibold hidden md:block">
                            AI 채팅 애플리케이션
                        </h1>
                        <h1 className="text-lg font-semibold md:hidden">
                            AI Chat
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button
                                variant={currentTab === 'chat' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentTab('chat')}
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">채팅</span>
                            </Button>
                            <Button
                                variant={currentTab === 'mcp' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentTab('mcp')}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">MCP 관리</span>
                            </Button>
                        </div>
                        {currentTab === 'chat' && (
                            <div className="text-xs text-gray-500 hidden sm:block">
                                모델: gemini-2.5-flash
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Desktop Sidebar */}
                    {currentTab === 'chat' && (
                        <div className="hidden md:block h-full">
                            <ChatSidebar
                                sessions={sessions}
                                currentSessionId={currentSessionId}
                                onSelectSession={handleSelectSession}
                                onCreateSession={handleCreateSession}
                                onDeleteSession={handleDeleteSession}
                            />
                        </div>
                    )}

                    {/* Active View */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-black">
                        {currentTab === 'chat' ? (
                            currentSessionId && <ChatWindow sessionId={currentSessionId} />
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 max-w-6xl mx-auto w-full">
                                <MCPManager />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MCPProvider>
    )
}
