import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getAvatarInitials(email: string): string {
    const parts = email.split('@')[0].split(/[.\-_]/)
    if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
}
