import {
    isPrismaClient,
    PrismaExecutor,
    TRANSACTION_OPTIONS,
} from '@/backend/infrastructure/repository/prisma'
import { TransactionClient } from '@/backend/infrastructure/repository/prisma/client/internal/prismaNamespace'
import { transactionStorage } from './prisma-transaction-manager'

export abstract class PrismaRepository {
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    protected get prisma() {
        return transactionStorage.getStore() ?? this.defaultPrisma
    }

    protected async runTransactionally<T>(
        execute: (client: TransactionClient) => Promise<T>,
    ): Promise<T> {
        if (isPrismaClient(this.prisma)) {
            return await this.prisma.$transaction(execute, TRANSACTION_OPTIONS)
        }
        return await execute(this.prisma)
    }
}
