export function SourceIcon({
    className,
    size = 24,
    strokeWidth = 1.875,
    ...props
}: React.SVGProps<SVGSVGElement> & {
    size?: number | string
    strokeWidth?: number | string
}) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            width={size}
            height={size}
            {...props}
        >
            <path d="M22 12 2 12" strokeWidth={strokeWidth} />
            <path
                d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2 -2v-6l-3.45 -6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0 -1.79 1.11z"
                strokeWidth={strokeWidth}
            />
            <path d="m6 16 0.01 0" strokeWidth={strokeWidth} />
            <path d="m10 16 0.01 0" strokeWidth={strokeWidth} />
        </svg>
    )
}
