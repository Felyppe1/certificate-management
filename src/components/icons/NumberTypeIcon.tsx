import { SVGProps } from 'react'

export function NumberTypeIcon({
    className,
    ...props
}: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            {...props}
        >
            <text
                x="11"
                y="19"
                textAnchor="middle"
                fontFamily="monospace"
                fontSize="18"
                fontWeight="700"
                letterSpacing="-1"
            >
                123
            </text>
        </svg>
    )
}
