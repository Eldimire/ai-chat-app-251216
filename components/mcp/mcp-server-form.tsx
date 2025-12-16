'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { MCPServerConfig, MCPTransportType } from '@/lib/types/mcp'

interface MCPServerFormProps {
    onSubmit: (config: MCPServerConfig) => void
    onCancel: () => void
    initialConfig?: Partial<MCPServerConfig>
    isLoading?: boolean
}

export function MCPServerForm({
    onSubmit,
    onCancel,
    initialConfig = {},
    isLoading = false
}: MCPServerFormProps) {
    const [formData, setFormData] = useState({
        name: initialConfig.name || '',
        description: initialConfig.description || '',
        transport: (initialConfig.transport as MCPTransportType) || 'stdio',
        command: initialConfig.command || '',
        args: initialConfig.args?.join(' ') || '',
        env: Object.entries(initialConfig.env || {})
            .map(([key, value]) => `${key}=${value}`)
            .join('\n'),
        url: initialConfig.url || '',
        headers: Object.entries(initialConfig.headers || {})
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const config: MCPServerConfig = {
            id: initialConfig.id || `mcp-${Date.now()}`,
            name: formData.name,
            description: formData.description,
            transport: formData.transport,
            command:
                formData.transport === 'stdio' ? formData.command : undefined,
            args:
                formData.transport === 'stdio' && formData.args
                    ? formData.args.split(' ').filter(Boolean)
                    : [],
            env:
                formData.transport === 'stdio' && formData.env
                    ? Object.fromEntries(
                          formData.env
                              .split('\n')
                              .filter(line => line.includes('='))
                              .map(line => {
                                  const [key, ...valueParts] = line.split('=')
                                  return [
                                      key.trim(),
                                      valueParts.join('=').trim()
                                  ]
                              })
                      )
                    : {},
            url:
                formData.transport === 'http' || formData.transport === 'sse'
                    ? formData.url
                    : undefined,
            headers:
                (formData.transport === 'http' ||
                    formData.transport === 'sse') &&
                formData.headers
                    ? Object.fromEntries(
                          formData.headers
                              .split('\n')
                              .filter(line => line.includes('='))
                              .map(line => {
                                  const [key, ...valueParts] = line.split('=')
                                  return [
                                      key.trim(),
                                      valueParts.join('=').trim()
                                  ]
                              })
                      )
                    : {},
            createdAt: initialConfig.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: initialConfig.isActive || false
        }

        onSubmit(config)
    }

    const updateFormData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>
                    {initialConfig.id ? 'MCP 서버 수정' : '새 MCP 서버 추가'}
                </CardTitle>
                <CardDescription>
                    MCP 서버 연결 정보를 입력하세요
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">서버 이름 *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={e =>
                                updateFormData('name', e.target.value)
                            }
                            placeholder="예: GitHub MCP Server"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">설명</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={e =>
                                updateFormData('description', e.target.value)
                            }
                            placeholder="서버에 대한 설명을 입력하세요"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="transport">전송 방식 *</Label>
                        <Select
                            value={formData.transport}
                            onValueChange={value =>
                                updateFormData('transport', value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="전송 방식을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="stdio">
                                    STDIO (서버에서 프로세스 실행)
                                </SelectItem>
                                <SelectItem value="sse">
                                    SSE (Server-Sent Events)
                                </SelectItem>
                                <SelectItem value="http">
                                    HTTP (Streamable HTTP 방식)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.transport === 'stdio' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="command">명령어 *</Label>
                                <Input
                                    id="command"
                                    value={formData.command}
                                    onChange={e =>
                                        updateFormData(
                                            'command',
                                            e.target.value
                                        )
                                    }
                                    placeholder="예: node, python, uvx"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="args">인수</Label>
                                <Input
                                    id="args"
                                    value={formData.args}
                                    onChange={e =>
                                        updateFormData('args', e.target.value)
                                    }
                                    placeholder="예: server.js --port 3000"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="env">환경 변수</Label>
                                <Textarea
                                    id="env"
                                    value={formData.env}
                                    onChange={e =>
                                        updateFormData('env', e.target.value)
                                    }
                                    placeholder="KEY1=value1&#10;KEY2=value2"
                                    className="min-h-[80px]"
                                />
                            </div>
                        </>
                    )}

                    {(formData.transport === 'http' ||
                        formData.transport === 'sse') && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="url">서버 URL *</Label>
                                <Input
                                    id="url"
                                    value={formData.url}
                                    onChange={e =>
                                        updateFormData('url', e.target.value)
                                    }
                                    placeholder="예: http://localhost:3001 또는 https://api.example.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="headers">HTTP 헤더</Label>
                                <Textarea
                                    id="headers"
                                    value={formData.headers}
                                    onChange={e =>
                                        updateFormData(
                                            'headers',
                                            e.target.value
                                        )
                                    }
                                    placeholder="Authorization=Bearer token&#10;Content-Type=application/json"
                                    className="min-h-[80px]"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading
                                ? '저장 중...'
                                : initialConfig.id
                                ? '수정'
                                : '추가'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                        >
                            취소
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
