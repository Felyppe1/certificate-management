import { ITransactionManager } from '@/backend/application/interfaces/itransaction-manager'
import { PrismaClient } from './client/client'
import { TransactionClient } from './client/internal/prismaNamespace'

export const transactionStorage = new AsyncLocalStorage<TransactionClient>()

export class PrismaTransactionManager implements ITransactionManager {
    constructor(private readonly prisma: PrismaClient) {}

    async run<T>(work: () => Promise<T>): Promise<T> {
        return await this.prisma.$transaction(async (tx: TransactionClient) => {
            return await transactionStorage.run(tx, work)
        })
    }
}
