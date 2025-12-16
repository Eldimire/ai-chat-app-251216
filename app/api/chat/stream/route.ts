import { GoogleGenAI, mcpToTool } from '@google/genai'
import { GlobalMcpManager } from '@/lib/mcp/global-manager'
import { ChatMessage } from '@/lib/chat/storage'

export const runtime = 'nodejs'

function sseEncode(data: unknown): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: Request) {
    const model = process.env.LLM_MODEL || 'gemini-2.5-flash'
    const apiKey = process.env.GEMINI_API_KEY

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                if (!apiKey) {
                    controller.enqueue(
                        sseEncode({
                            type: 'error',
                            code: 'NO_API_KEY',
                            message:
                                '서버에 GEMINI_API_KEY가 설정되지 않았습니다.'
                        })
                    )
                    controller.enqueue(sseEncode({ type: 'done' }))
                    controller.close()
                    return
                }

                const body = await req.json()
                const messages = body.messages

                if (!messages || !Array.isArray(messages) || messages.length === 0) {
                    controller.enqueue(
                        sseEncode({
                            type: 'error',
                            code: 'NO_MESSAGES',
                            message: '메시지 목록이 필요합니다.'
                        })
                    )
                    controller.enqueue(sseEncode({ type: 'done' }))
                    controller.close()
                    return
                }

                // Convert ChatMessage to Gemini Content format
                // ChatMessage: { role: 'user' | 'assistant', content: string }
                // Gemini: { role: 'user' | 'model', parts: [{ text: string }] }
                // TODO: For better history support, we might need to store full part objects.
                // For now, we assume simple text history.
                const contents = messages.map((msg: ChatMessage) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }))

                const ai = new GoogleGenAI({ apiKey })

                // Get active MCP clients
                const activeConnections = GlobalMcpManager.getAllConnections()
                const tools = activeConnections.map(conn => mcpToTool(conn.client))

                const response = await ai.models.generateContentStream({
                    model,
                    contents,
                    config: {
                        tools: tools.length > 0 ? tools : undefined
                    }
                })

                for await (const chunk of response) {
                    // console.log('Chunk:', JSON.stringify(chunk, null, 2)) // Debugging

                    // Handle text content
                    const text = chunk.text
                    if (text) {
                        controller.enqueue(
                            sseEncode({ type: 'text', delta: text })
                        )
                    }

                    // Handle function calls (if exposed in chunks)
                    const functionCalls = chunk.functionCalls
                    if (functionCalls && functionCalls.length > 0) {
                         for (const call of functionCalls) {
                            controller.enqueue(
                                sseEncode({ 
                                    type: 'tool_call', 
                                    tool: {
                                        name: call.name,
                                        args: call.args
                                    }
                                })
                            )
                        }
                    }

                    // Handle function responses (if exposed)
                    // Note: With mcpToTool and auto-execution, we might see the results in subsequent chunks
                    // or in specific parts of the chunk.
                    // The Google GenAI Node SDK structure for chunks is a bit complex.
                    // We'll try to extract executableCode or functionResponse if available.
                    
                    // Note: The SDK's `chunk.text()` helper handles extracting text from parts.
                    // We might need to look at `chunk.candidates[0].content.parts` for more details.
                }

                controller.enqueue(sseEncode({ type: 'done' }))
                controller.close()
            } catch (err: unknown) {
                console.error('Gemini API Error:', err)
                const status =
                    typeof err === 'object' && err && 'status' in err
                        ? (err as { status?: number }).status ?? 500
                        : 500
                let code = 'INTERNAL_ERROR'
                if (status === 401 || status === 403) code = 'UNAUTHORIZED'
                else if (status === 429) code = 'RATE_LIMIT'
                else if (status >= 500) code = 'UPSTREAM_ERROR'

                controller.enqueue(
                    sseEncode({
                        type: 'error',
                        code,
                        message:
                            typeof err === 'object' && err && 'message' in err
                                ? String((err as { message?: unknown }).message)
                                : '알 수 없는 오류가 발생했습니다.'
                    })
                )
                controller.enqueue(sseEncode({ type: 'done' }))
                controller.close()
            }
        }
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    })
}
