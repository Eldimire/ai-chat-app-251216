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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Code,
    MessageSquare,
    FileText,
    Play,
    ChevronDown,
    ChevronRight,
    Copy,
    Check
} from 'lucide-react'
import {
    ConnectedMCPServer,
    MCPTool,
    MCPPrompt,
    MCPResource
} from '@/lib/types/mcp'

interface MCPServerDetailsProps {
    server: ConnectedMCPServer
    onToolCall: (
        toolName: string,
        args: Record<string, unknown>
    ) => Promise<unknown>
    onPromptCall: (
        promptName: string,
        args: Record<string, unknown>
    ) => Promise<unknown>
    onResourceRead: (uri: string) => Promise<unknown>
}

interface CollapsibleSectionProps {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
}

function CollapsibleSection({
    title,
    children,
    defaultOpen = false
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="border rounded-lg">
            <button
                className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-medium">{title}</span>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronRight className="w-4 h-4" />
                )}
            </button>
            {isOpen && <div className="p-3 border-t">{children}</div>}
        </div>
    )
}

function ToolCard({
    tool,
    onCall
}: {
    tool: MCPTool
    onCall: (name: string, args: Record<string, unknown>) => Promise<unknown>
}) {
    const [args, setArgs] = useState('')
    const [result, setResult] = useState<unknown>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [jsonError, setJsonError] = useState<string | null>(null)

    const handleCall = async () => {
        setIsLoading(true)
        setJsonError(null)
        try {
            let parsedArgs = {}
            if (args.trim()) {
                try {
                    parsedArgs = JSON.parse(args)
                } catch {
                    setJsonError('유효하지 않은 JSON 형식입니다')
                    setIsLoading(false)
                    return
                }
            }
            const response = await onCall(tool.name, parsedArgs)
            setResult(response)
        } catch (error) {
            setResult({
                error:
                    error instanceof Error ? error.message : '알 수 없는 오류'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleArgsChange = (value: string) => {
        setArgs(value)
        setJsonError(null)

        // 실시간 JSON 유효성 검사
        if (value.trim()) {
            try {
                JSON.parse(value)
            } catch {
                setJsonError('유효하지 않은 JSON 형식입니다')
            }
        }
    }

    const copyResult = () => {
        if (result) {
            navigator.clipboard.writeText(JSON.stringify(result, null, 2))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <CollapsibleSection title={`🔧 ${tool.name}`}>
            <div className="space-y-3">
                {tool.description && (
                    <p className="text-sm text-muted-foreground">
                        {tool.description}
                    </p>
                )}

                {tool.inputSchema?.properties &&
                    Object.keys(tool.inputSchema.properties).length > 0 && (
                        <div>
                            <Label className="text-sm font-medium">
                                필요한 인수:
                            </Label>
                            <div className="mt-2 space-y-2">
                                {Object.entries(
                                    tool.inputSchema.properties
                                ).map(([paramName, paramInfo]) => (
                                    <div
                                        key={paramName}
                                        className="text-xs text-muted-foreground border-l-2 border-blue-200 pl-3"
                                    >
                                        <div className="font-medium">
                                            {paramName}
                                            <span className="text-gray-500">
                                                ({paramInfo.type})
                                            </span>
                                            {tool.inputSchema.required?.includes(
                                                paramName
                                            ) && (
                                                <span className="text-red-500 ml-1">
                                                    *
                                                </span>
                                            )}
                                        </div>
                                        {paramInfo.description && (
                                            <div className="mt-1">
                                                {paramInfo.description}
                                            </div>
                                        )}
                                        {paramInfo.enum && (
                                            <div className="mt-1">
                                                <span className="font-medium">
                                                    선택값:
                                                </span>{' '}
                                                {paramInfo.enum.join(', ')}
                                            </div>
                                        )}
                                        {paramInfo.default !== undefined && (
                                            <div className="mt-1">
                                                <span className="font-medium">
                                                    기본값:
                                                </span>{' '}
                                                {String(paramInfo.default)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                <div className="space-y-2">
                    <Label htmlFor={`args-${tool.name}`}>인수 (JSON)</Label>
                    <Textarea
                        id={`args-${tool.name}`}
                        value={args}
                        onChange={e => handleArgsChange(e.target.value)}
                        placeholder={
                            tool.inputSchema?.properties
                                ? `{\n${Object.entries(
                                      tool.inputSchema.properties
                                  )
                                      .map(
                                          ([key, info]) =>
                                              `  "${key}": "${
                                                  info.type === 'string'
                                                      ? 'value'
                                                      : info.type === 'number'
                                                      ? '0'
                                                      : 'value'
                                              }"`
                                      )
                                      .join(',\n')}\n}`
                                : '{"param1": "value1", "param2": "value2"}'
                        }
                        className={`min-h-[80px] font-mono text-sm ${
                            jsonError ? 'border-red-500' : ''
                        }`}
                    />
                    {jsonError && (
                        <p className="text-xs text-red-500">{jsonError}</p>
                    )}
                </div>

                <Button onClick={handleCall} disabled={isLoading} size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    {isLoading ? '실행 중...' : '실행'}
                </Button>

                {result !== null && result !== undefined && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>실행 결과</Label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={copyResult}
                            >
                                {copied ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                        <ScrollArea className="h-32 w-full border rounded p-3">
                            <pre className="text-xs">
                                {typeof result === 'string'
                                    ? result
                                    : JSON.stringify(result, null, 2)}
                            </pre>
                        </ScrollArea>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    )
}

function PromptCard({
    prompt,
    onCall
}: {
    prompt: MCPPrompt
    onCall: (name: string, args: Record<string, unknown>) => Promise<unknown>
}) {
    const [args, setArgs] = useState('')
    const [result, setResult] = useState<unknown>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleCall = async () => {
        setIsLoading(true)
        try {
            let parsedArgs = {}
            if (args.trim()) {
                parsedArgs = JSON.parse(args)
            }
            const response = await onCall(prompt.name, parsedArgs)
            setResult(response)
        } catch (error) {
            setResult({
                error:
                    error instanceof Error ? error.message : '알 수 없는 오류'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <CollapsibleSection title={`💬 ${prompt.name}`}>
            <div className="space-y-3">
                {prompt.description && (
                    <p className="text-sm text-muted-foreground">
                        {prompt.description}
                    </p>
                )}

                {prompt.arguments && prompt.arguments.length > 0 && (
                    <div>
                        <Label className="text-sm font-medium">
                            필요한 인수:
                        </Label>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                            {prompt.arguments.map((arg, index) => (
                                <li key={index}>
                                    • {arg.name}{' '}
                                    {arg.required && (
                                        <span className="text-red-500">*</span>
                                    )}
                                    {arg.description && ` - ${arg.description}`}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor={`args-${prompt.name}`}>인수 (JSON)</Label>
                    <Textarea
                        id={`args-${prompt.name}`}
                        value={args}
                        onChange={e => setArgs(e.target.value)}
                        placeholder='{"param1": "value1", "param2": "value2"}'
                        className="min-h-[80px] font-mono text-sm"
                    />
                </div>

                <Button onClick={handleCall} disabled={isLoading} size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    {isLoading ? '실행 중...' : '실행'}
                </Button>

                {result !== null && result !== undefined && (
                    <div className="space-y-2">
                        <Label>실행 결과</Label>
                        <ScrollArea className="h-32 w-full border rounded p-3">
                            <pre className="text-xs">
                                {typeof result === 'string'
                                    ? result
                                    : JSON.stringify(result, null, 2)}
                            </pre>
                        </ScrollArea>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    )
}

function ResourceCard({
    resource,
    onRead
}: {
    resource: MCPResource
    onRead: (uri: string) => Promise<unknown>
}) {
    const [result, setResult] = useState<unknown>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleRead = async () => {
        setIsLoading(true)
        try {
            const response = await onRead(resource.uri)
            setResult(response)
        } catch (error) {
            setResult({
                error:
                    error instanceof Error ? error.message : '알 수 없는 오류'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <CollapsibleSection title={`📄 ${resource.name || resource.uri}`}>
            <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                        <span className="font-medium">URI:</span> {resource.uri}
                    </div>
                    {resource.description && (
                        <div>
                            <span className="font-medium">설명:</span>{' '}
                            {resource.description}
                        </div>
                    )}
                    {resource.mimeType && (
                        <div>
                            <span className="font-medium">타입:</span>{' '}
                            {resource.mimeType}
                        </div>
                    )}
                </div>

                <Button onClick={handleRead} disabled={isLoading} size="sm">
                    <FileText className="w-4 h-4 mr-1" />
                    {isLoading ? '읽는 중...' : '읽기'}
                </Button>

                {result !== null && result !== undefined && (
                    <div className="space-y-2">
                        <Label>내용</Label>
                        <ScrollArea className="h-32 w-full border rounded p-3">
                            <pre className="text-xs">
                                {typeof result === 'string'
                                    ? result
                                    : JSON.stringify(result, null, 2)}
                            </pre>
                        </ScrollArea>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    )
}

export function MCPServerDetails({
    server,
    onToolCall,
    onPromptCall,
    onResourceRead
}: MCPServerDetailsProps) {
    return (
        <Card className="w-full max-w-4xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {server.config.name}
                    <Badge variant="default" className="bg-green-500">
                        연결됨
                    </Badge>
                </CardTitle>
                <CardDescription>
                    {server.config.description || '설명 없음'}
                </CardDescription>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="font-medium">서버:</span>{' '}
                        {server.info.name}
                    </div>
                    <div>
                        <span className="font-medium">버전:</span>{' '}
                        {server.info.version}
                    </div>
                    <div>
                        <span className="font-medium">전송:</span>{' '}
                        {server.config.transport.toUpperCase()}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="tools" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger
                            value="tools"
                            className="flex items-center gap-2"
                        >
                            <Code className="w-4 h-4" />
                            도구 ({server.tools.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="prompts"
                            className="flex items-center gap-2"
                        >
                            <MessageSquare className="w-4 h-4" />
                            프롬프트 ({server.prompts.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="resources"
                            className="flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            리소스 ({server.resources.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tools" className="space-y-4">
                        {server.tools.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                사용 가능한 도구가 없습니다.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {server.tools.map(tool => (
                                    <ToolCard
                                        key={tool.name}
                                        tool={tool}
                                        onCall={onToolCall}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="prompts" className="space-y-4">
                        {server.prompts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                사용 가능한 프롬프트가 없습니다.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {server.prompts.map(prompt => (
                                    <PromptCard
                                        key={prompt.name}
                                        prompt={prompt}
                                        onCall={onPromptCall}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="resources" className="space-y-4">
                        {server.resources.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                사용 가능한 리소스가 없습니다.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {server.resources.map(resource => (
                                    <ResourceCard
                                        key={resource.uri}
                                        resource={resource}
                                        onRead={onResourceRead}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
