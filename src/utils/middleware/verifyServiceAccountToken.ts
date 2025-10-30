import { NextRequest } from 'next/server'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'

export async function verifyServiceAccountToken(req: NextRequest) {
    const googleAuthGateway = new GoogleAuthGateway()
    const oAuth2Client = googleAuthGateway.getOAuth2Client()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer '))
        throw new AuthenticationError('missing-session') // TODO: change to missing-token

    const token = authHeader.replace('Bearer ', '')

    try {
        const ticket = await oAuth2Client.verifyIdToken({
            idToken: token,
            audience: process.env.NEXT_PUBLIC_BASE_URL,
        })
        const payload = ticket.getPayload()

        const allowedServiceAccount = process.env.CLOUD_FUNCTIONS_SA_EMAIL
        if (payload?.email !== allowedServiceAccount) {
            throw new AuthenticationError('invalid-service-account')
        }

        return payload
    } catch (err) {
        console.error('Erro ao verificar token IAM:', err)
        throw new AuthenticationError('invalid-service-token')
    }
}
