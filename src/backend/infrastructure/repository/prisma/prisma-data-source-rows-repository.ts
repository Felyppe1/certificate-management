import { ColumnType } from '@/backend/domain/data-source'
import { isPrismaClient, PrismaExecutor } from '.'
import { transactionStorage } from './prisma-transaction-manager'
import { IDataSourceRowsRepository } from '@/backend/application/interfaces/repository/idata-source-rows-repository'
import {
    DataSourceRow,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/data-source-row'
import { TransactionClient } from './client/internal/prismaNamespace'
import { IDataSourceRowsReadRepository } from '@/backend/application/interfaces/repository/idata-source-rows-read-repository'

const GET_MANY_DEFAULT_LIMIT = 100

export class PrismaDataSourceRowsRepository
    implements IDataSourceRowsRepository, IDataSourceRowsReadRepository
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

    async getById(id: string): Promise<DataSourceRow | null> {
        const row = await this.prisma.dataSourceRow.findUnique({
            where: { id },
            include: {
                DataSourceValue: {
                    include: {
                        DataSourceColumn: true,
                    },
                },
            },
        })

        if (!row) {
            return null
        }

        const certificateEmissionId = row.data_source_id

        // Get the data source columns
        const dataSourceColumns = await this.prisma.dataSourceColumn.findMany({
            where: {
                data_source_id: certificateEmissionId,
            },
        })

        const columns = dataSourceColumns.map(col => ({
            name: col.name,
            type: col.type.toLowerCase() as ColumnType,
        }))

        const data: Record<string, string> = {}
        for (const value of row.DataSourceValue) {
            data[value.column_name] = value.value
        }

        return new DataSourceRow({
            id: row.id,
            certificateEmissionId,
            fileBytes: row.file_bytes,
            data,
            dataSourceColumns: columns,
            processingStatus: row.processing_status as any,
        })
    }

    async update(dataSourceRow: DataSourceRow): Promise<void> {
        const { id, fileBytes, processingStatus, certificateEmissionId } =
            dataSourceRow.serialize()

        await this.prisma.dataSourceRow.update({
            where: { id },
            data: {
                file_bytes: fileBytes,
                processing_status: processingStatus,
            },
        })
    }

    // async getManyByCertificateEmissionId(
    //     certificateEmissionId: string,
    // ): Promise<DataSourceRow[]> {
    //     // Query through DataSourceValue since that's where the certificate_emission_id (data_source_id) is stored
    //     const dataSourceRows = await this.prisma.dataSourceRow.findMany({
    //         where: {
    //             data_source_id: certificateEmissionId,
    //         },
    //         include: {
    //             DataSourceValue: {
    //                 where: {
    //                     data_source_id: certificateEmissionId,
    //                 },
    //                 include: {
    //                     DataSourceColumn: true,
    //                 },
    //             },
    //         },
    //     })

    //     // Get the data source columns once (all rows have the same columns)
    //     const dataSourceColumns = await this.prisma.dataSourceColumn.findMany({
    //         where: {
    //             data_source_id: certificateEmissionId,
    //         },
    //     })

    //     const columns = dataSourceColumns.map(col => ({
    //         name: col.name,
    //         type: col.type.toLowerCase() as ColumnType,
    //     }))

    //     return dataSourceRows.map(row => {
    //         const data: Record<string, string> = {}
    //         for (const value of row.DataSourceValue) {
    //             data[value.column_name] = value.value
    //         }

    //         return new DataSourceRow({
    //             id: row.id,
    //             certificateEmissionId,
    //             fileBytes: row.file_bytes,
    //             data,
    //             dataSourceColumns: columns,
    //             processingStatus: row.processing_status as any,
    //         })
    //     })
    // }

    async updateManyProcessingStatus(
        ids: string[],
        status: PROCESSING_STATUS_ENUM,
    ): Promise<void> {
        if (ids.length === 0) return

        await this.prisma.dataSourceRow.updateMany({
            where: {
                id: { in: ids },
            },
            data: {
                processing_status: status,
            },
        })
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

    async getColumnValuesByCertificateEmissionId(
        certificateEmissionId: string,
        columnName: string,
    ): Promise<string[]> {
        const values = await this.prisma.dataSourceValue.findMany({
            where: {
                data_source_id: certificateEmissionId,
                column_name: columnName,
            },
            select: {
                value: true,
            },
        })

        return values.map(v => v.value)
    }

    async allRowsFinishedProcessing(
        certificateEmissionId: string,
    ): Promise<boolean> {
        const count = await this.prisma.dataSourceRow.count({
            where: {
                data_source_id: certificateEmissionId,
                processing_status: {
                    notIn: [
                        PROCESSING_STATUS_ENUM.COMPLETED,
                        PROCESSING_STATUS_ENUM.FAILED,
                    ],
                },
            },
        })

        return count === 0
    }

    // IDataSourceRowsReadRepository
    async getManyByCertificateEmissionId(
        certificateEmissionId: string,
        limit = GET_MANY_DEFAULT_LIMIT,
        cursor?: string,
        statuses?: PROCESSING_STATUS_ENUM[],
    ) {
        const rows = await this.prisma.dataSourceRow.findMany({
            where: {
                data_source_id: certificateEmissionId,
                ...(statuses &&
                    statuses.length > 0 && {
                        processing_status: {
                            in: statuses,
                        },
                    }),
            },
            take: limit + 1, // Get lines + 1 to determine if there's a next page
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1,
            }),
            orderBy: { id: 'asc' },
            include: {
                DataSourceValue: {
                    where: {
                        data_source_id: certificateEmissionId,
                    },
                    select: {
                        column_name: true,
                        value: true,
                    },
                },
            },
        })

        let nextCursor: string | null = null

        if (rows.length > limit) {
            const nextItem = rows.pop()!
            nextCursor = nextItem.id
        }

        const resultRows = rows.map(resultRow => {
            const data: Record<string, string> = {}

            for (const value of resultRow.DataSourceValue) {
                data[value.column_name] = value.value
            }

            return {
                id: resultRow.id,
                data,
            }
        })

        return {
            data: resultRows,
            nextCursor,
        }
    }

    async countByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<number> {
        return this.prisma.dataSourceRow.count({
            where: {
                data_source_id: certificateEmissionId,
            },
        })
    }

    async countWithStatuses(
        certificateEmissionId: string,
        statuses: [PROCESSING_STATUS_ENUM],
    ): Promise<number> {
        return this.prisma.dataSourceRow.count({
            where: {
                data_source_id: certificateEmissionId,
                processing_status: {
                    in: statuses,
                },
            },
        })
    }
}
