import { execSync } from 'child_process'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { PrismaPg } from '@prisma/adapter-pg'

export let prisma: PrismaClient

beforeAll(async () => {
    console.log('Setting up test database...')

    const host = process.env.TEST_DB_HOST
    const port = process.env.TEST_DB_PORT
    const username = process.env.TEST_DB_USERNAME
    const password = process.env.TEST_DB_PASSWORD
    const database = process.env.TEST_DB_NAME

    const testDbUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`

    process.env.DB_URL = testDbUrl
    process.env.DB_DIRECT_URL = testDbUrl

    execSync(
        'npx prisma db push --skip-generate --schema src/backend/infrastructure/repository/prisma/schema.prisma',
        { stdio: 'ignore' },
    )

    const connectionString = `${process.env.DB_URL}`

    const adapter = new PrismaPg({ connectionString })
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
