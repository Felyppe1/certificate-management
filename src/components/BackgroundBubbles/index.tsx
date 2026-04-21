export function BackgroundBubbles() {
    return (
        <>
            <div className="fixed top-32 left-[8%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none -z-1 animate-float"></div>
            <div className="fixed top-[35%] right-[5%] w-80 h-80 bg-purple-600/25 rounded-full blur-3xl pointer-events-none -z-1 animate-float-delayed"></div>
            <div className="fixed bottom-[20%] left-[30%] w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-1 animate-float-slow"></div>
            <div className="fixed top-[55%] right-[28%] w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -z-1 animate-float-reverse"></div>
            <div className="fixed bottom-10 right-[8%] w-88 h-88 bg-violet-600/20 rounded-full blur-3xl pointer-events-none -z-1 animate-float-wide"></div>
        </>
    )
}
