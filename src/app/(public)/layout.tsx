import Link from 'next/link'

interface PublicLayoutProps {
    children: React.ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
    return (
        <div className="flex flex-col justify-center min-h-screen bg-background pt-10 px-5 xs:px-10 pb-20 relative z-10">
            <div className="w-full max-w-7xl mx-auto">
                <div className="mb-8 sm:mb-10 flex items-center justify-center">
                    <Link
                        href="/"
                        className="flex items-center gap-3 p-2 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                    >
                        <img
                            src="/logo.png"
                            alt="Certifica"
                            className="w-12 sm:w-14"
                        />
                        <span className="text-3xl sm:text-4xl font-medium text-white">
                            Certifica
                        </span>
                    </Link>
                </div>

                {children}
            </div>

            <div className="fixed top-40 right-20 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none -z-1 animate-float"></div>
            <div className="fixed bottom-40 left-20 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl pointer-events-none -z-1 animate-float-delayed"></div>
        </div>
    )
}
