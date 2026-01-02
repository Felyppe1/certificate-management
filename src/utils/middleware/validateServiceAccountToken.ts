import { NextRequest } from 'next/server'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { LoginTicket } from 'google-auth-library'

export async function validateServiceAccountToken(req: NextRequest) {
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
            audience: process.env.CLOUD_RUN_APP_URL,
        })
    } catch (err) {
        console.error('Error validating service token:', err)
        throw new AuthenticationError('invalid-service-token')
    }

    const payload = ticket.getPayload()
    const allowedServiceAccount = process.env.CLOUD_FUNCTIONS_SA_EMAIL

    if (payload?.email !== allowedServiceAccount) {
        throw new AuthenticationError('invalid-service-account')
    }

    return payload!.email as string
}
