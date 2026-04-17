import { afterAll, beforeAll, beforeEach } from 'vitest'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

export let prisma: PrismaClient

beforeAll(async () => {
    console.log('Setting up test database...')

    const connectionString = process.env.TEST_DB_URI

    process.env.DB_URL = connectionString
    process.env.DB_DIRECT_URL = connectionString

    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    prisma = new PrismaClient({ adapter })
}, 60000)

beforeEach(async () => {
    // Truncate all tables and reset sequences
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    `

    for (const { tablename } of tables) {
        if (tablename !== '_prisma_migrations') {
            await prisma.$executeRawUnsafe(
                `TRUNCATE TABLE "public"."${tablename}" RESTART IDENTITY CASCADE;`,
            )
        }
    }
})

afterAll(async () => {
    console.log('Disconnecting from test database...')

    // Disconnect only once at the end
    if (prisma) {
        await prisma.$disconnect()
    }
})
