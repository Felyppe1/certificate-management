import { Prisma, PrismaClient } from './client/client'

export const prisma = new PrismaClient()

export type PrismaExecutor = PrismaClient | Prisma.TransactionClient

export function isPrismaClient(client: PrismaExecutor): client is PrismaClient {
    return '$transaction' in client
}
