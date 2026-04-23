import Image from 'next/image'

interface LogoProps {
    className?: string
}

export function Logo({ className }: LogoProps) {
    return (
        <Image
            src="/logo.png"
            alt="Certifica"
            width={338}
            height={91}
            className={className}
            priority
        />
    )
}
