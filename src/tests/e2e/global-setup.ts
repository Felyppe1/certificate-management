import { test as setup } from '@playwright/test'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { execSync } from 'child_process'
import {
    DB_HOST_PORT,
    DB_NAME,
    DB_PASSWORD,
    DB_URL,
    DB_USERNAME,
    PRISMA_SCHEMA_PATH,
} from './config'
import { seedDatabase } from './db-seed'

// `setup db` project (project dependency): runs once before the browser tests.
// Starts the Postgres container (fixed port + reuse), applies the schema and runs the seed.
setup('prepara o banco de dados', async () => {
    // `withReuse()` is mandatory: this Node process exits at the end of the setup
    // project; without reuse, testcontainers would tear down the container (Ryuk)
    // and the webServer would lose the database. With reuse + a fixed port, the
    // container survives and everyone connects through the same DB_URL.
    await new PostgreSqlContainer('postgres')
        .withUsername(DB_USERNAME)
        .withPassword(DB_PASSWORD)
        .withDatabase(DB_NAME)
        .withExposedPorts({ container: 5432, host: DB_HOST_PORT })
        .withReuse()
        .start()

    execSync(`npx prisma db push --schema ${PRISMA_SCHEMA_PATH}`, {
        stdio: 'inherit',
        env: { ...process.env, DB_URL, DB_DIRECT_URL: DB_URL },
    })

    const pool = new Pool({ connectionString: DB_URL })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    await seedDatabase(prisma)

    await prisma.$disconnect()
    await pool.end()
})
