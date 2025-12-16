'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ChatStorage, type ChatMessage } from '@/lib/chat/storage'

interface ChatWindowProps {
    sessionId: string
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
    const markdownComponents: Components = {
        code({ className, children, ...props }) {
            const codeText = String(children).replace(/\n$/, '')
            const isInline =
                !/(^|\s)language-[\w-]+/.test(className || '') &&
                !codeText.includes('\n')
            if (isInline) {
                return (
                    <code
                        className="rounded bg-gray-200 dark:bg-gray-700 px-1 py-0.5 text-[0.85em]"
                        {...props}
                    >
                        {children}
                    </code>
                )
            }
            return (
                <div className="relative group">
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(codeText)
                            } catch {}
                        }}
                        className="absolute top-2 right-2 rounded-md border px-2 py-1 text-xs bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black text-gray-700 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition"
                    >
                        복사
                    </button>
                    <pre className="overflow-x-auto rounded-md bg-gray-950 text-gray-100 p-3 text-[0.9em]">
                        <code className={className}>{codeText}</code>
                    </pre>
                </div>
            )
        },
        a({ href, children, ...props }) {
            return (
                <a
                    href={href as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                    {...props}
                >
                    {children}
                </a>
            )
        },
        table({ children }) {
            return (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        {children}
                    </table>
                </div>
            )
        }
    }

    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const endRef = useRef<HTMLDivElement | null>(null)
    const prevSessionIdRef = useRef<string | null>(null)

    // Load messages when sessionId changes
    useEffect(() => {
        if (prevSessionIdRef.current !== sessionId) {
            setMessages(ChatStorage.getSessionMessages(sessionId))
            prevSessionIdRef.current = sessionId
            setLoading(false)
            if (abortRef.current) {
                abortRef.current.abort()
                abortRef.current = null
            }
        }
    }, [sessionId])

    // Persist messages on change
    useEffect(() => {
        if (messages.length > 0) {
            ChatStorage.saveSessionMessages(sessionId, messages)
        }
    }, [messages, sessionId])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const canSend = useMemo(
        () => input.trim().length > 0 && !loading,
        [input, loading]
    )

    async function handleSend(e?: React.FormEvent) {
        e?.preventDefault()
        const prompt = input.trim()
        if (!prompt || loading) return

        setInput('')
        setLoading(true)
        const controller = new AbortController()
        abortRef.current = controller

        const userMsg: ChatMessage = { role: 'user', content: prompt }
        const aiMsg: ChatMessage = { role: 'assistant', content: '' }
        
        // Update local state immediately
        const newMessages = [...messages, userMsg, aiMsg]
        setMessages(newMessages)
        ChatStorage.saveSessionMessages(sessionId, newMessages)

        try {
            const res = await fetch(
                '/api/chat/stream',
                {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        Accept: 'text/event-stream' 
                    },
                    body: JSON.stringify({
                        messages: newMessages
                    }),
                    signal: controller.signal
                }
            )
            if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let assistantBuffer = ''
            let sseBuffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                sseBuffer += chunk
                const events = sseBuffer.split(/\n\n/)
                sseBuffer = events.pop() ?? ''
                for (const line of events) {
                    const m = line.match(/^data: (.*)$/m)
                    if (!m) continue
                    try {
                        const evt = JSON.parse(m[1])
                        if (
                            evt.type === 'text' &&
                            typeof evt.delta === 'string'
                        ) {
                            assistantBuffer += evt.delta
                            setMessages(prev => {
                                const next = [...prev]
                                next[next.length - 1] = {
                                    role: 'assistant',
                                    content: assistantBuffer
                                }
                                return next
                            })
                        } else if (evt.type === 'tool_call') {
                            const toolName = evt.tool.name
                            const args = JSON.stringify(evt.tool.args, null, 2)
                            const toolCallText = `\n\n> 🛠️ **Tool Call**: \`${toolName}\`\n> Arguments:\n> \`\`\`json\n> ${args.replace(/\n/g, '\n> ')}\n> \`\`\`\n\n`
                            
                            assistantBuffer += toolCallText
                            setMessages(prev => {
                                const next = [...prev]
                                next[next.length - 1] = {
                                    role: 'assistant',
                                    content: assistantBuffer
                                }
                                return next
                            })
                        } else if (evt.type === 'error') {
                            throw new Error(evt.message || '오류')
                        }
                    } catch {}
                }
            }
        } catch (error) {
            if ((error as Error).name === 'AbortError') return

            setMessages(prev => {
                const next = [...prev]
                const last = next[next.length - 1]
                next[next.length - 1] = {
                    role: 'assistant',
                    content:
                        (last?.content || '') +
                        `\n\n[에러] ${
                            error instanceof Error
                                ? error.message
                                : '요청 중 오류가 발생했습니다.'
                        }`
                }
                return next
            })
        } finally {
            setLoading(false)
            abortRef.current = null
        }
    }

    function handleStop() {
        abortRef.current?.abort()
        setLoading(false)
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <main className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">
                        질문을 입력해 대화를 시작하세요.
                    </div>
                ) : (
                    <div className="space-y-4 pb-4">
                        {messages.map((m, i) => {
                            const isLastAssistant =
                                m.role === 'assistant' &&
                                i === messages.length - 1 &&
                                loading
                            return (
                                <div
                                    key={i}
                                    className={
                                        m.role === 'user'
                                            ? 'text-right'
                                            : 'text-left'
                                    }
                                >
                                    <div
                                        className={
                                            m.role === 'user'
                                                ? 'inline-block rounded-2xl px-4 py-2 bg-blue-600 text-white whitespace-pre-wrap break-words'
                                                : 'inline-block rounded-2xl px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-full'
                                        }
                                        style={{
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {m.role === 'assistant' ? (
                                            <div className="markdown-body leading-relaxed text-sm">
                                                <ReactMarkdown
                                                    remarkPlugins={[
                                                        remarkGfm
                                                    ]}
                                                    rehypePlugins={[
                                                        rehypeHighlight
                                                    ]}
                                                    components={
                                                        markdownComponents
                                                    }
                                                >
                                                    {m.content}
                                                </ReactMarkdown>
                                                {isLastAssistant && (
                                                    <span className="inline-block w-2 align-baseline animate-pulse">
                                                        ▍
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            m.content
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={endRef} />
                    </div>
                )}
            </main>

            <div className="p-4 border-t bg-white dark:bg-black">
                <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto w-full">
                    <input
                        className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
                        placeholder="메시지를 입력하세요..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={loading}
                    />
                    {loading ? (
                        <button
                            type="button"
                            onClick={handleStop}
                            className="px-4 py-2 rounded-md bg-red-600 text-white whitespace-nowrap"
                        >
                            중지
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!canSend}
                            className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 whitespace-nowrap"
                        >
                            전송
                        </button>
                    )}
                </form>
                <p className="text-center text-xs text-gray-500 mt-2">
                    이 세션은 localStorage에 저장됩니다. 공용 PC에서는 민감정보 입력에 유의하세요.
                </p>
            </div>
        </div>
    )
}

