import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

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

    const environmentVariables = {
        ...process.env,
        IS_E2E: 'true',
        NEXT_PUBLIC_BASE_URL: 'http://localhost:3001',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? 'test-client-id',
        GOOGLE_CLIENT_SECRET:
            process.env.GOOGLE_CLIENT_SECRET ?? 'test-client-secret',
        GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ?? 'test-project',
        CERTIFICATES_BUCKET: process.env.CERTIFICATES_BUCKET ?? '',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? 'test-key',
        RESEND_API_KEY: process.env.RESEND_API_KEY ?? 'test-key',
        BREVO_API_KEY: process.env.BREVO_API_KEY ?? 'test-key',
        OWNER_EMAIL: process.env.OWNER_EMAIL ?? 'test@test.com',
        REDIS_URL: 'redis://localhost:6380',
        LOKI_URL: 'http://localhost:3100',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'http://localhost:4318/v1/logs',
        PORT: '3001',
    }

    console.log('Building Next.js application for E2E tests...')
    execSync('npm run build', {
        stdio: 'inherit',
        env: environmentVariables,
    })

    console.log('Copying static assets to standalone folder...')
    const standaloneDir = path.join(process.cwd(), '.next/standalone')
    const standaloneNextDir = path.join(standaloneDir, '.next')

    // Guarantee the folder exists before copying
    if (!fs.existsSync(standaloneNextDir)) {
        fs.mkdirSync(standaloneNextDir, { recursive: true })
    }

    if (fs.existsSync(path.join(process.cwd(), 'public'))) {
        fs.cpSync(
            path.join(process.cwd(), 'public'),
            path.join(standaloneDir, 'public'),
            { recursive: true },
        )
    }

    fs.cpSync(
        path.join(process.cwd(), '.next/static'),
        path.join(standaloneDir, '.next/static'),
        { recursive: true },
    )

    if (fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
        fs.cpSync(
            path.join(process.cwd(), 'node_modules'),
            path.join(standaloneDir, 'node_modules'),
            { recursive: true },
        )
    }

    console.log('Starting Next.js production server on port 3001...')
    const nextProcess = spawn('node', ['.next/standalone/server.js'], {
        env: environmentVariables,
        stdio: 'inherit',
    })

    await new Promise(resolve => nextProcess.on('close', resolve))
}

startServer().catch(err => {
    console.error(err)
    process.exit(1)
})
