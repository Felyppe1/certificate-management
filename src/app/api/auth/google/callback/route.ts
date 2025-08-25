import { ExternalUserAccount } from '@/backend/application/interfaces/external-user-account'
import { User } from '@/backend/application/interfaces/users-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { OAuth2Client } from 'google-auth-library'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'

const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/google/callback',
)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    console.log(searchParams)
    const code = searchParams.get('code')

    if (!code) {
        console.log('No code provided')
        return NextResponse.redirect(
            process.env.NEXT_PUBLIC_BASE_URL + '/entrar',
        )
    }

    const { tokens } = await oAuth2Client.getToken(code)

    console.log('Tokens received:', tokens)

    const ticket = await oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()

    console.log('Payload:', payload)

    const usersRepository = new PrismaUsersRepository()
    const externalUserAccountsRepository =
        new PrismaExternalUserAccountsRepository()
    const sessionsRepository = new PrismaSessionsRepository()

    if (payload?.email) {
        const userExists = await usersRepository.getByEmail(payload.email)

        let newUser: User

        if (!userExists) {
            const newUser: User = {
                id: crypto.randomUUID(),
                email: payload.email,
                name: payload.name!,
                passwordHash: null,
            }

            await usersRepository.save(newUser)
        }

        const user = userExists ? userExists : newUser!

        const externalAccount = await externalUserAccountsRepository.getById(
            user.id,
            'GOOGLE',
        )

        if (!externalAccount) {
            const newExternalAccount: ExternalUserAccount = {
                userId: user.id,
                provider: 'GOOGLE',
                providerUserId: payload.sub!,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token ?? null,
                accessTokenExpiryDateTime: null,
                refreshTokenExpiryDateTime: null,
            }

            await externalUserAccountsRepository.save(newExternalAccount)
        } else {
            externalAccount.accessToken = tokens.access_token!
            externalAccount.refreshToken = tokens.refresh_token ?? null
            externalAccount.accessTokenExpiryDateTime = null
            externalAccount.refreshTokenExpiryDateTime = null

            await externalUserAccountsRepository.update(externalAccount)
        }

        const sessionToken = crypto.randomBytes(32).toString('hex')

        await sessionsRepository.save({
            userId: user.id,
            token: sessionToken,
        })

        const cookie = await cookies()

        cookie.set('session_token', sessionToken, {
            httpOnly: true,
            path: '/',
            // secure: true,
            // sameSite: "strict"
        })
    }

    // oAuth2Client.setCredentials(tokens);
    return NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL + '/')
}
