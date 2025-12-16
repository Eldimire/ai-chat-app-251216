'use client'

import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/lib/chat/storage'

interface ChatSidebarProps {
    sessions: ChatSession[]
    currentSessionId: string | null
    onSelectSession: (id: string) => void
    onCreateSession: () => void
    onDeleteSession: (id: string, e: React.MouseEvent) => void
}

export function ChatSidebar({
    sessions,
    currentSessionId,
    onSelectSession,
    onCreateSession,
    onDeleteSession
}: ChatSidebarProps) {
    return (
        <div className="flex h-full w-64 flex-col border-r bg-gray-50/50 dark:bg-gray-900/50">
            <div className="p-4 border-b">
                <Button 
                    onClick={onCreateSession} 
                    className="w-full justify-start gap-2" 
                    variant="default"
                >
                    <Plus className="w-4 h-4" />
                    새 채팅방
                </Button>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-2 p-2">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn(
                                "group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
                                currentSessionId === session.id && "bg-gray-200 dark:bg-gray-800 font-medium"
                            )}
                            onClick={() => onSelectSession(session.id)}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <MessageSquare className="w-4 h-4 shrink-0 text-gray-500" />
                                <span className="truncate">{session.title}</span>
                            </div>
                            <button
                                onClick={(e) => onDeleteSession(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                                title="삭제"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    
                    {sessions.length === 0 && (
                        <div className="text-center text-xs text-gray-500 py-4">
                            생성된 채팅방이 없습니다.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

