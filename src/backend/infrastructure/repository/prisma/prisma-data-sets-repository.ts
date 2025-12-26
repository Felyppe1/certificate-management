import { IDataSetsRepository } from '@/backend/application/interfaces/idata-sets-repository'
import { DataSet, GENERATION_STATUS } from '@/backend/domain/data-set'
import { Prisma } from './client/client'
import { isPrismaClient, PrismaExecutor } from '.'
import { transactionStorage } from './prisma-transaction-manager'

export class PrismaDataSetsRepository implements IDataSetsRepository {
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    private get prisma() {
        return transactionStorage.getStore() || this.defaultPrisma
    }

    async save(dataSet: DataSet): Promise<void> {
        const {
            id,
            certificateEmissionId,
            rows,
            generationStatus,
            totalBytes,
        } = dataSet.serialize()

        await this.prisma.dataSet.create({
            data: {
                id,
                certificate_emission_id: certificateEmissionId,
                rows,
                generation_status: generationStatus,
                total_bytes: totalBytes,
            },
        })
    }

    async getById(dataSetId: string): Promise<DataSet | null> {
        const dataSet = await this.prisma.dataSet.findUnique({
            where: { id: dataSetId },
        })

        if (!dataSet) {
            return null
        }

        const rows = Array.isArray(dataSet.rows)
            ? (dataSet.rows as Record<string, any>[])
            : []

        return new DataSet({
            generationStatus: dataSet.generation_status as GENERATION_STATUS,
            id: dataSet.id,
            certificateEmissionId: dataSet.certificate_emission_id,
            totalBytes: dataSet.total_bytes,
            rows,
        })
    }

    async getByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<DataSet | null> {
        const dataSet = await this.prisma.dataSet.findUnique({
            where: { certificate_emission_id: certificateEmissionId },
        })

        if (!dataSet) {
            return null
        }

        const rows = Array.isArray(dataSet.rows)
            ? (dataSet.rows as Record<string, any>[])
            : []

        return new DataSet({
            generationStatus: dataSet.generation_status as GENERATION_STATUS,
            id: dataSet.id,
            certificateEmissionId: dataSet.certificate_emission_id,
            totalBytes: dataSet.total_bytes,
            rows,
        })
    }

    async upsert(dataSet: DataSet): Promise<void> {
        const {
            id,
            certificateEmissionId,
            rows,
            generationStatus,
            totalBytes,
        } = dataSet.serialize()

        const execute = async (tx: Prisma.TransactionClient) => {
            await tx.dataSet.upsert({
                where: { certificate_emission_id: certificateEmissionId },
                create: {
                    id,
                    certificate_emission_id: certificateEmissionId,
                    rows,
                    generation_status: generationStatus,
                    total_bytes: totalBytes,
                },
                update: {
                    rows,
                    generation_status: generationStatus,
                    total_bytes: totalBytes,
                },
            })

            if (generationStatus === GENERATION_STATUS.COMPLETED) {
                await tx.certificateGenerationHistory.create({
                    data: {
                        quantity: rows.length,
                        certificate_emission_id: certificateEmissionId,
                    },
                })
            }
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
    }
}
