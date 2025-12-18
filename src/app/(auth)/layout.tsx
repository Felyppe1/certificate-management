interface SystemLayoutProps {
    children: React.ReactNode
}

export default function Layout({ children }: SystemLayoutProps) {
    return (
        <div className="flex flex-col justify-center min-h-screen bg-background relative z-10">
            <div>{children}</div>

            <div className="fixed top-40 right-20 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none -z-1 animate-float"></div>
            <div className="fixed bottom-40 left-20 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl pointer-events-none -z-1 animate-float-delayed"></div>
        </div>
    )
}
