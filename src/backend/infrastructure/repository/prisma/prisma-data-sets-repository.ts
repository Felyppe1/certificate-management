import { IDataSetsRepository } from '@/backend/application/interfaces/idata-sets-repository'
import { DataSet, GENERATION_STATUS } from '@/backend/domain/data-set'
import { prisma } from '.'

export class PrismaDataSetsRepository implements IDataSetsRepository {
    async save(dataSet: DataSet): Promise<void> {
        const { id, dataSourceId, rows, generationStatus } = dataSet.serialize()

        await prisma.dataSet.create({
            data: {
                id,
                data_source_id: dataSourceId,
                rows,
                generation_status: generationStatus,
            },
        })
    }

    async getById(dataSetId: string): Promise<DataSet | null> {
        const dataSet = await prisma.dataSet.findUnique({
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
            dataSourceId: dataSet.data_source_id,
            rows,
        })
    }

    async update(dataSet: DataSet): Promise<void> {
        const { id, dataSourceId, rows, generationStatus } = dataSet.serialize()

        // TODO: CONSERTAR ISSO AQUI DE UPSET PRA UPDATE
        await prisma.dataSet.upsert({
            where: { data_source_id: dataSourceId },
            create: {
                id,
                data_source_id: dataSourceId,
                rows,
                generation_status: generationStatus,
            },
            update: {
                rows,
                generation_status: generationStatus,
            },
        })
        // await prisma.dataSet.update({
        //     where: { id },
        //     data: {
        //         data_source_id: dataSourceId,
        //         rows,
        //         generation_status: generationStatus,
        //     },
        // })
    }
}
