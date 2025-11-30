import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from './client/client'

const connectionString = `${process.env.DB_URL}`

const adapter = new PrismaPg({ connectionString })
export const prisma = new PrismaClient({ adapter })

export type PrismaExecutor = PrismaClient | Prisma.TransactionClient

export function isPrismaClient(client: PrismaExecutor): client is PrismaClient {
    return '$transaction' in client
}
