import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { env } from '@/env'
import { LoginTicket } from 'google-auth-library'
import { NextRequest } from 'next/server'

export async function validateServiceAccountToken(req: NextRequest) {
    if (env.NODE_ENV !== 'production') return

    const googleAuthGateway = new GoogleAuthGateway()
    const oAuth2Client = googleAuthGateway.getOAuth2Client()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer '))
        throw new AuthenticationError('missing-token')

    const token = authHeader.replace('Bearer ', '')

    let ticket: LoginTicket

    try {
        ticket = await oAuth2Client.verifyIdToken({
            idToken: token,
            audience: env.CLOUD_RUN_APP_URL,
        })
    } catch (err) {
        console.error('Error validating service token:', err)
        throw new AuthenticationError('invalid-service-token')
    }

    const payload = ticket.getPayload()
    const allowedServiceAccount = env.CLOUD_FUNCTIONS_SA_EMAIL

    if (payload?.email !== allowedServiceAccount) {
        throw new AuthenticationError('invalid-service-account')
    }

    return payload!.email as string
}
