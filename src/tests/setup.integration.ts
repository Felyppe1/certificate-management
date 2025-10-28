import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import util from 'util'
import { exec } from 'child_process'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const execAsync = util.promisify(exec)

let postgresContainer: StartedPostgreSqlContainer
export let prisma: PrismaClient

beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer('postgres')
        .withReuse()
        .start()

    process.env.DB_URL = postgresContainer.getConnectionUri()
    process.env.DB_DIRECT_URL = postgresContainer.getConnectionUri()

    await execAsync('npx prisma generate && npx prisma migrate deploy')

    prisma = new PrismaClient()
}, 60000)

beforeEach(async () => {
    const tablenames = await prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
    `

    for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
            await prisma.$executeRawUnsafe(
                `TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE;`,
            )
        }
    }
})

afterAll(async () => {
    await prisma.$disconnect()
    await postgresContainer?.stop()
})
