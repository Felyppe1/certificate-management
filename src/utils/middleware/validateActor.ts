import { NextRequest } from 'next/server'
import { validateServiceAccountToken } from './validateServiceAccountToken'
import { validateSessionToken } from './validateSessionToken'

interface ValidateActorOutput {
    id: string
    type: 'USER' | 'SYSTEM'
}

export async function validateActor(
    req: NextRequest,
): Promise<ValidateActorOutput> {
    const authHeader = req.headers.get('Authorization')

    if (
        authHeader?.startsWith('Bearer ') &&
        !req.cookies.get('session_token')
    ) {
        try {
            const serviceAccountEmail = await validateServiceAccountToken(req)
            return { id: serviceAccountEmail, type: 'SYSTEM' }
        } catch {
            // May be a user Bearer token, try the next method
        }
    }

    const { userId } = await validateSessionToken(req)
    return { id: userId, type: 'USER' }
}
