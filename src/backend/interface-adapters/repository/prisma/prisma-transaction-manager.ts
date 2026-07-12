import { AsyncLocalStorage } from 'async_hooks'
import { ITransactionManager } from '@/backend/application/interfaces/repository/itransaction-manager'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { TransactionClient } from '@/backend/infrastructure/repository/prisma/client/internal/prismaNamespace'
import { TRANSACTION_OPTIONS } from '@/backend/infrastructure/repository/prisma'

export const transactionStorage = new AsyncLocalStorage<TransactionClient>()

export class PrismaTransactionManager implements ITransactionManager {
    constructor(private readonly prisma: PrismaClient) {}

    async run<T>(work: () => Promise<T>): Promise<T> {
        return await this.prisma.$transaction(async (tx: TransactionClient) => {
            return await transactionStorage.run(tx, work)
        }, TRANSACTION_OPTIONS)
    }
}
