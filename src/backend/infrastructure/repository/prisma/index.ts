import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from './client/client'
import { env } from '@/env'

const connectionString = `${env.DB_URL}`

const adapter = new PrismaPg({ connectionString })
export const prisma = new PrismaClient({ adapter })

export type PrismaExecutor = PrismaClient | Prisma.TransactionClient

export function isPrismaClient(client: PrismaExecutor): client is PrismaClient {
    return '$transaction' in client
}
