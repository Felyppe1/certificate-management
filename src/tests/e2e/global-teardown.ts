import { test as teardown } from '@playwright/test'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { Storage } from '@google-cloud/storage'
import { GcpBucket } from '@/backend/interface-adapters/cloud/gcp/gcp-bucket'
import { DB_URL } from './config'

// `cleanup db` project (teardown of the `setup db` project): runs once after all
// browser tests. Safety net for whatever per-test cleanup missed (e.g. a worker
// crash). Does NOT stop the container (kept warm via `withReuse()`).
teardown('limpa banco e arquivos residuais', async () => {
    const pool = new Pool({ connectionString: DB_URL })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    const users = await prisma.user.findMany({ select: { id: true } })

    // Best-effort: removes files left in the bucket (template/data source uploads
    // go to real GCS, under the `users/{userId}/` prefix). A failure here should
    // not bring down the teardown (e.g. an environment without GCP credentials).
    const bucketName = process.env.CERTIFICATES_BUCKET
    if (bucketName && users.length > 0) {
        try {
            const bucket = new GcpBucket(new Storage())
            await Promise.all(
                users.map(user =>
                    bucket.deleteObjectsWithPrefix({
                        bucketName,
                        prefix: `users/${user.id}/`,
                    }),
                ),
            )
        } catch (error) {
            console.warn(
                'Failed to clean up the bucket during teardown:',
                error,
            )
        }
    }

    // Removes leftover users — the cascade cleans up sessions, emissions,
    // templates, data sources, emails, etc.
    await prisma.user.deleteMany({})

    await prisma.$disconnect()
    await pool.end()
})
