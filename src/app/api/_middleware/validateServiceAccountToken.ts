import { MissingTokenError } from '@/backend/domain/error/authentication-error/missing-token-error'
import { InvalidServiceTokenError } from '@/backend/domain/error/authentication-error/invalid-service-token-error'
import { InvalidServiceAccountError } from '@/backend/domain/error/authentication-error/invalid-service-account-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { env } from '@/env'
import { LoginTicket } from 'google-auth-library'
import { NextRequest } from 'next/server'

export async function validateServiceAccountToken(req: NextRequest) {
    if (env.NODE_ENV !== 'production' || env.IS_E2E) return

    const googleAuthGateway = new GoogleAuthGateway()
    const oAuth2Client = googleAuthGateway.getOAuth2Client()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new MissingTokenError()

    const token = authHeader.replace('Bearer ', '')

    let ticket: LoginTicket

    try {
        ticket = await oAuth2Client.verifyIdToken({
            idToken: token,
            audience: env.CLOUD_RUN_APP_URL,
        })
    } catch (err) {
        console.error('Error validating service token:', err)
        throw new InvalidServiceTokenError()
    }

    const payload = ticket.getPayload()
    const allowedServiceAccount = env.CLOUD_FUNCTIONS_SA_EMAIL

    if (payload?.email !== allowedServiceAccount) {
        throw new InvalidServiceAccountError()
    }

    return payload!.email as string
}
