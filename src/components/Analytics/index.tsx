'use client'

import { GoogleAnalytics, sendGAEvent } from '@next/third-parties/google'
import { useEffect } from 'react'

interface AnalyticsProps {
    GA_ID: string
    userEmail: string | null
}

async function identifyUser(email: string) {
    return email
}

export function Analytics({ GA_ID, userEmail }: AnalyticsProps) {
    useEffect(() => {
        if (!userEmail) return

        const run = async () => {
            const hashedEmail = await identifyUser(userEmail)
            sendGAEvent('set', 'user_id', hashedEmail)
        }

        run()
    }, [userEmail])

    return <GoogleAnalytics gaId={GA_ID} debugMode />
}
