import { IDataSetsRepository } from '@/backend/application/interfaces/idata-sets-repository'
import { DataSet, GENERATION_STATUS } from '@/backend/domain/data-set'
import { PrismaClient } from './client/client'

export class PrismaDataSetsRepository implements IDataSetsRepository {
    constructor(private readonly prisma: PrismaClient) {}

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

        const operations: any[] = [
            this.prisma.dataSet.upsert({
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
            }),
        ]

        if (generationStatus === GENERATION_STATUS.COMPLETED) {
            operations.push(
                this.prisma.certificateGenerationHistory.create({
                    data: {
                        quantity: rows.length,
                        certificate_emission_id: certificateEmissionId,
                    },
                }),
            )
        }

        // await prisma.dataSet.update({
        //     where: { id },
        //     data: {
        //         data_source_id: dataSourceId,
        //         rows,
        //         generation_status: generationStatus,
        //     },
        // })

        await this.prisma.$transaction(operations)
    }
}
