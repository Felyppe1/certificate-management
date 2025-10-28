import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import util from 'util'
import { exec, execSync } from 'child_process'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const username = 'root'
const password = 'password'

let postgresContainer: StartedPostgreSqlContainer
let adminDbUrl: string
let adminPrismaClient: PrismaClient

let testDatabaseName: string
let testDatabaseUrl: string

export let prisma: PrismaClient

beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer('postgres')
        .withUsername(username)
        .withPassword(password)
        .withReuse()
        .start()

    adminDbUrl = postgresContainer.getConnectionUri()

    adminPrismaClient = new PrismaClient({
        datasources: {
            db: {
                url: adminDbUrl,
            },
        },
    })
}, 60000)

beforeEach(async () => {
    testDatabaseName = `test_${randomUUID().substring(0, 18).replace(/-/g, '_')}`
    testDatabaseUrl = `postgresql://${username}:${password}@${postgresContainer.getHost()}:${postgresContainer.getPort()}/${testDatabaseName}`

    await adminPrismaClient.$queryRawUnsafe(
        `CREATE DATABASE "${testDatabaseName}";`,
    )

    process.env.DB_URL = testDatabaseUrl
    process.env.DB_DIRECT_URL = testDatabaseUrl

    execSync('npx prisma db push --skip-generate' /* , { stdio: 'ignore' } */)

    prisma = new PrismaClient({
        datasources: {
            db: {
                url: testDatabaseUrl,
            },
        },
    })
})

afterEach(async () => {
    if (prisma) {
        await prisma.$disconnect()
    }

    // WITH (FORCE) to disconnect any active connections
    if (adminPrismaClient && testDatabaseName) {
        await adminPrismaClient.$queryRawUnsafe(
            `DROP DATABASE "${testDatabaseName}" WITH (FORCE);`,
        )
    }
})

afterAll(async () => {
    await adminPrismaClient?.$disconnect()
    await postgresContainer?.stop()
})
