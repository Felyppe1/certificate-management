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
            const certificateEmissionId =
                dataSourceRows[0].getCertificateEmissionId()

            // First, delete old rows (values were deleted in the certificates repository)
            await tx.dataSourceRow.deleteMany({
                where: {
                    data_source_id: certificateEmissionId,
                },
            })

            // Second, create new rows
            await tx.dataSourceRow.createMany({
                data: dataSourceRows.map(dataSourceRow => {
                    const {
                        id,
                        fileBytes,
                        processingStatus,
                        certificateEmissionId,
                        sourceRowIndex,
                    } = dataSourceRow.serialize()

                    return {
                        id,
                        data_source_id: certificateEmissionId,
                        file_bytes: fileBytes,
                        processing_status: processingStatus,
                        source_row_index: sourceRowIndex,
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

        const data: Record<string, string> = {}
        for (const value of row.DataSourceValue) {
            data[value.column_name] = value.value
        }

        return new DataSourceRow({
            id: row.id,
            certificateEmissionId,
            fileBytes: row.file_bytes,
            data,
            processingStatus: row.processing_status as any,
            sourceRowIndex: row.source_row_index,
        })
    }

    async getByIds(ids: string[]): Promise<DataSourceRow[]> {
        if (ids.length === 0) return []

        const rows = await this.prisma.dataSourceRow.findMany({
            where: { id: { in: ids } },
            include: {
                DataSourceValue: {
                    include: {
                        DataSourceColumn: true,
                    },
                },
            },
        })

        if (rows.length === 0) return []

        return rows.map(row => {
            const data: Record<string, string> = {}
            for (const value of row.DataSourceValue) {
                data[value.column_name] = value.value
            }
            return new DataSourceRow({
                id: row.id,
                certificateEmissionId: row.data_source_id,
                fileBytes: row.file_bytes,
                data,
                processingStatus: row.processing_status as any,
                sourceRowIndex: row.source_row_index,
            })
        })
    }

    async update(dataSourceRow: DataSourceRow): Promise<void> {
        const { id, fileBytes, processingStatus, certificateEmissionId, data } =
            dataSourceRow.serialize()

        const execute = async (tx: TransactionClient) => {
            await tx.dataSourceRow.update({
                where: { id },
                data: {
                    file_bytes: fileBytes,
                    processing_status: processingStatus,
                },
            })

            for (const [columnName, value] of Object.entries(data)) {
                await tx.dataSourceValue.update({
                    where: {
                        data_source_id_column_name_data_source_row_id: {
                            data_source_id: certificateEmissionId,
                            column_name: columnName,
                            data_source_row_id: id,
                        },
                    },
                    data: {
                        value: String(value),
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

    async updateMany(dataSourceRows: DataSourceRow[]): Promise<void> {
        if (dataSourceRows.length === 0) return

        const execute = async (tx: TransactionClient) => {
            for (const row of dataSourceRows) {
                const {
                    id,
                    fileBytes,
                    processingStatus,
                    certificateEmissionId,
                    data,
                } = row.serialize()

                await tx.dataSourceRow.update({
                    where: { id },
                    data: {
                        file_bytes: fileBytes,
                        processing_status: processingStatus,
                    },
                })

                for (const [columnName, value] of Object.entries(data)) {
                    await tx.dataSourceValue.update({
                        where: {
                            data_source_id_column_name_data_source_row_id: {
                                data_source_id: certificateEmissionId,
                                column_name: columnName,
                                data_source_row_id: id,
                            },
                        },
                        data: {
                            value,
                        },
                    })
                }
            }
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
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

    // TODO: delete, not being used
    async deleteManyByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<void> {
        console.log(certificateEmissionId)
        const execute = async (tx: TransactionClient) => {
            const result = await tx.dataSourceRow.deleteMany({
                where: {
                    data_source_id: certificateEmissionId,
                },
            })
            console.log('result', result)

            // await tx.dataSourceColumns.deleteMany({
            //     where: {
            //         data_source_id: certificateEmissionId,
            //     },
            // })
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
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
        let count: number = 0
        const execute = async (tx: TransactionClient) => {
            count = await tx.dataSourceRow.count({
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
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }

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

    async getAllRawByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<{ id: string; data: Record<string, string> }[]> {
        const rows = await this.prisma.dataSourceRow.findMany({
            where: {
                data_source_id: certificateEmissionId,
            },
            orderBy: { source_row_index: 'asc' },
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

        return rows.map(row => {
            const data: Record<string, string> = {}
            for (const value of row.DataSourceValue) {
                data[value.column_name] = value.value
            }
            return { id: row.id, data }
        })
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
