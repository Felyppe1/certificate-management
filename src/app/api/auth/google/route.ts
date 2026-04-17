import { env } from '@/env'
import { NextResponse } from 'next/server'

export async function GET() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'

    const options = {
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: env.NEXT_PUBLIC_BASE_URL + '/api/auth/google/callback',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'select_account',
        scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
        ].join(' '),
    }

    const qs = new URLSearchParams(options)

    return NextResponse.redirect(`${rootUrl}?${qs.toString()}`)
}
