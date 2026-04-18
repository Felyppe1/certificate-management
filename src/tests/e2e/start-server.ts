import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync, spawn } from 'child_process'

const HOST_PORT = 54332

async function startServer() {
    console.log('Starting PostgreSQL container for E2E tests on fixed port...')

    process.env.TEST_DB_USERNAME = 'root'
    process.env.TEST_DB_PASSWORD = 'password'
    process.env.TEST_DB_NAME = 'testdb'

    await new PostgreSqlContainer('postgres')
        .withUsername(process.env.TEST_DB_USERNAME)
        .withPassword(process.env.TEST_DB_PASSWORD)
        .withDatabase(process.env.TEST_DB_NAME)
        .withExposedPorts({ container: 5432, host: HOST_PORT })
        .withReuse()
        .start()

    const dbUri = `postgresql://${process.env.TEST_DB_USERNAME}:${process.env.TEST_DB_PASSWORD}@localhost:${HOST_PORT}/${process.env.TEST_DB_NAME}?schema=public`

    process.env.DB_URL = dbUri
    process.env.DB_DIRECT_URL = dbUri

    execSync(
        'npx prisma db push --schema src/backend/infrastructure/repository/prisma/schema.prisma',
        {
            stdio: 'inherit',
            env: {
                ...process.env,
            },
        },
    )

    console.log('Starting Next.js dev server on port 3001...')

    const nextProcess = spawn('npx', ['next', 'dev', '--port', '3001'], {
        env: {
            ...process.env,
            NEXT_PUBLIC_BASE_URL: 'http://localhost:3001',
            GOOGLE_CLIENT_ID: 'test-client-id',
            GOOGLE_CLIENT_SECRET: 'test-client-secret',
            NODE_ENV: 'development',
        },
        stdio: 'inherit',
    })

    await new Promise(resolve => nextProcess.on('close', resolve))
}

startServer().catch(err => {
    console.error(err)
    process.exit(1)
})
