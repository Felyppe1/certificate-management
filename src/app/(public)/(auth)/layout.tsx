import { Toast } from '@/components/Toast'
import { BackgroundBubbles } from '@/components/BackgroundBubbles'

interface SystemLayoutProps {
    children: React.ReactNode
}

export default function Layout({ children }: SystemLayoutProps) {
    return (
        <div className="flex flex-col justify-center min-h-screen bg-background relative z-10">
            <Toast />
            <div>{children}</div>

            <BackgroundBubbles />
        </div>
    )
}
