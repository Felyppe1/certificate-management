import { AsyncLocalStorage } from 'async_hooks'
import {
    ITransactionManager,
    TransactionOptions,
} from '@/backend/application/interfaces/repository/itransaction-manager'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { TransactionClient } from '@/backend/infrastructure/repository/prisma/client/internal/prismaNamespace'
import { TRANSACTION_OPTIONS } from '@/backend/infrastructure/repository/prisma'

export const transactionStorage = new AsyncLocalStorage<TransactionClient>()

export class PrismaTransactionManager implements ITransactionManager {
    constructor(private readonly prisma: PrismaClient) {}

    async run<T>(
        work: () => Promise<T>,
        options?: TransactionOptions,
    ): Promise<T> {
        return await this.prisma.$transaction(async (tx: TransactionClient) => {
            return await transactionStorage.run(tx, async () => {
                await this.acquireLocks(tx, options?.serializeOn)
                return await work()
            })
        }, TRANSACTION_OPTIONS)
    }

    /**
     * Serializes the transaction on the given keys via transaction-level
     * advisory locks. Keys are sorted to guarantee a consistent acquisition
     * order across concurrent transactions — avoids deadlock. The lock
     * (pg_advisory_xact_lock) is released automatically on commit/rollback.
     */
    private async acquireLocks(
        tx: TransactionClient,
        keys?: string[],
    ): Promise<void> {
        if (!keys?.length) return
        const sortedKeys = [...keys].sort()
        for (const key of sortedKeys) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
        }
    }
}
