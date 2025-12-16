export interface Toast {
    id: string
    title: string
    description?: string
    variant?: 'default' | 'destructive'
}

export function toast(props: Omit<Toast, 'id'>) {
    // 실제 toast 구현을 위한 간단한 알림
    if (props.variant === 'destructive') {
        console.error(`[Toast Error] ${props.title}: ${props.description}`)
        alert(`오류: ${props.title}\n${props.description}`)
    } else {
        console.log(`[Toast] ${props.title}: ${props.description}`)
        // 간단한 성공 알림
        if (typeof window !== 'undefined') {
            const notification = document.createElement('div')
            notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 9999;
        max-width: 300px;
        font-size: 14px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      `
            notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${props.title}</div>
        ${
            props.description
                ? `<div style="opacity: 0.9;">${props.description}</div>`
                : ''
        }
      `

            document.body.appendChild(notification)

            setTimeout(() => {
                notification.style.transform = 'translateX(400px)'
                notification.style.opacity = '0'
                notification.style.transition = 'all 0.3s ease'

                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification)
                    }
                }, 300)
            }, 3000)
        }
    }
}

export function useToast() {
    return { toast }
}
