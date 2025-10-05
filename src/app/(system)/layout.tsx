interface SystemLayoutProps {
    children: React.ReactNode
}

export default function Layout({ children }: SystemLayoutProps) {
    return (
        <>
            <div className="min-h-screen bg-background">{children}</div>
        </>
    )
}
