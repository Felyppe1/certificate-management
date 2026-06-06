import { test as base } from '@playwright/test'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

type MyFixtures = {
    prisma: PrismaClient
}

export const test = base.extend<MyFixtures>({
    prisma: [
        async ({}, use) => {
            const connectionString =
                'postgresql://root:password@localhost:54332/testdb?schema=public'

            process.env.DB_URL = connectionString
            process.env.DB_DIRECT_URL = connectionString

            const pool = new Pool({ connectionString })
            const adapter = new PrismaPg(pool)
            const prisma = new PrismaClient({ adapter })

            await use(prisma)

            await prisma.$disconnect()
            await pool.end()
        },
        { auto: true },
    ],
})

export { expect } from '@playwright/test'
