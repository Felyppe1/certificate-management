import { ColumnType } from '@/backend/domain/data-source'
import { isPrismaClient, PrismaExecutor } from '.'
import { transactionStorage } from './prisma-transaction-manager'
import { IDataSourceRowsRepository } from '@/backend/application/interfaces/repository/idata-source-rows-repository'
import {
    DataSourceRow,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/data-source-row'
import { TransactionClient } from './client/internal/prismaNamespace'

export class PrismaDataSourceRowsRepository
    implements IDataSourceRowsRepository
{
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    private get prisma() {
        return transactionStorage.getStore() || this.defaultPrisma
    }

    async saveMany(dataSourceRows: DataSourceRow[]): Promise<void> {
        const execute = async (tx: TransactionClient) => {
            // First, create all DataSourceRows
            await tx.dataSourceRow.createMany({
                data: dataSourceRows.map(dataSourceRow => {
                    const {
                        id,
                        fileBytes,
                        processingStatus,
                        certificateEmissionId,
                    } = dataSourceRow.serialize()

                    return {
                        id,
                        data_source_id: certificateEmissionId,
                        file_bytes: fileBytes,
                        processing_status: processingStatus,
                    }
                }),
            })

            // Then, create all DataSourceValues
            const dataSourceValues = dataSourceRows.flatMap(dataSourceRow => {
                const { id, certificateEmissionId, data } =
                    dataSourceRow.serialize()

                return Object.entries(data).map(([columnName, value]) => ({
                    data_source_id: certificateEmissionId,
                    column_name: columnName,
                    data_source_row_id: id,
                    value: String(value), // Ensure value is a string
                }))
            })

            await tx.dataSourceValue.createMany({
                data: dataSourceValues,
            })
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
    }

    // async save(dataSet: DataSet): Promise<void> {
    //     const {
    //         id,
    //         certificateEmissionId,
    //         rows,
    //         generationStatus,
    //         totalBytes,
    //     } = dataSet.serialize()

    //     await this.prisma.dataSet.create({
    //         data: {
    //             id,
    //             certificate_emission_id: certificateEmissionId,
    //             rows,
    //             generation_status: generationStatus,
    //             total_bytes: totalBytes,
    //         },
    //     })
    // }

    // async getById(dataSetId: string): Promise<DataSet | null> {
    //     const dataSet = await this.prisma.dataSet.findUnique({
    //         where: { id: dataSetId },
    //     })

    //     if (!dataSet) {
    //         return null
    //     }

    //     const rows = Array.isArray(dataSet.rows)
    //         ? (dataSet.rows as Record<string, any>[])
    //         : []

    //     return new DataSet({
    //         generationStatus: dataSet.generation_status as GENERATION_STATUS,
    //         id: dataSet.id,
    //         certificateEmissionId: dataSet.certificate_emission_id,
    //         totalBytes: dataSet.total_bytes,
    //         rows,
    //     })
    // }

    async getManyByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<DataSourceRow[]> {
        // Query through DataSourceValue since that's where the certificate_emission_id (data_source_id) is stored
        const dataSourceRows = await this.prisma.dataSourceRow.findMany({
            where: {
                data_source_id: certificateEmissionId,
            },
            include: {
                DataSourceValue: {
                    where: {
                        data_source_id: certificateEmissionId,
                    },
                    include: {
                        DataSourceColumn: true,
                    },
                },
            },
        })

        // Get the data source columns once (all rows have the same columns)
        const dataSourceColumns = await this.prisma.dataSourceColumn.findMany({
            where: {
                data_source_id: certificateEmissionId,
            },
        })

        const columnTypeMap = dataSourceColumns.map(col => ({
            name: col.name,
            type: col.type.toLowerCase() as ColumnType,
        }))

        return dataSourceRows.map(row => {
            const data: Record<string, string> = {}
            for (const value of row.DataSourceValue) {
                data[value.column_name] = value.value
            }

            return new DataSourceRow({
                id: row.id,
                certificateEmissionId,
                fileBytes: row.file_bytes,
                data,
                dataSourceColumns: columnTypeMap,
                processingStatus: row.processing_status as any,
            })
        })
    }

    async updateMany(dataSourceRows: DataSourceRow[]): Promise<void> {
        const execute = async (tx: TransactionClient) => {
            await Promise.all(
                dataSourceRows.map(dataSourceRow => {
                    const { id, fileBytes, processingStatus } =
                        dataSourceRow.serialize()

                    return tx.dataSourceRow.update({
                        where: { id },
                        data: {
                            file_bytes: fileBytes,
                            processing_status: processingStatus,
                        },
                    })
                }),
            )
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
    }

    async resetProcessingStatusByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<void> {
        await this.prisma.dataSourceRow.updateMany({
            where: {
                data_source_id: certificateEmissionId,
            },
            data: {
                processing_status: PROCESSING_STATUS_ENUM.PENDING,
            },
        })
    }

    async deleteManyByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<void> {
        await this.prisma.dataSourceRow.deleteMany({
            where: {
                data_source_id: certificateEmissionId,
            },
        })
    }

    // async upsert(dataSet: DataSet): Promise<void> {
    //     const {
    //         id,
    //         certificateEmissionId,
    //         rows,
    //         generationStatus,
    //         totalBytes,
    //     } = dataSet.serialize()

    //     const execute = async (tx: Prisma.TransactionClient) => {
    //         await tx.dataSet.upsert({
    //             where: { certificate_emission_id: certificateEmissionId },
    //             create: {
    //                 id,
    //                 certificate_emission_id: certificateEmissionId,
    //                 rows,
    //                 generation_status: generationStatus,
    //                 total_bytes: totalBytes,
    //             },
    //             update: {
    //                 rows,
    //                 generation_status: generationStatus,
    //                 total_bytes: totalBytes,
    //             },
    //         })

    //         if (generationStatus === GENERATION_STATUS.COMPLETED) {
    //             await tx.certificateGenerationHistory.create({
    //                 data: {
    //                     quantity: rows.length,
    //                     certificate_emission_id: certificateEmissionId,
    //                 },
    //             })
    //         }
    //     }

    //     if (isPrismaClient(this.prisma)) {
    //         await this.prisma.$transaction(execute)
    //     } else {
    //         await execute(this.prisma)
    //     }
    // }
}
