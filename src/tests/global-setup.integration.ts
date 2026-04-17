import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { execSync } from 'child_process'

let postgresContainer: StartedPostgreSqlContainer

export async function setup() {
    console.log('Starting PostgreSQL container')

    process.env.TEST_DB_USERNAME = 'root'
    process.env.TEST_DB_PASSWORD = 'password'

    postgresContainer = await new PostgreSqlContainer('postgres')
        .withUsername(process.env.TEST_DB_USERNAME)
        .withPassword(process.env.TEST_DB_PASSWORD)
        .withReuse()
        .start()

    process.env.TEST_DB_HOST = postgresContainer.getHost()
    process.env.TEST_DB_PORT = postgresContainer.getPort().toString()
    process.env.TEST_DB_URI = postgresContainer.getConnectionUri()
    process.env.TEST_DB_NAME = postgresContainer.getDatabase()

    execSync(
        'npx prisma db push --schema src/backend/infrastructure/repository/prisma/schema.prisma',
        {
            stdio: 'inherit',
            env: {
                ...process.env,
                DB_URL: process.env.TEST_DB_URI,
                DB_DIRECT_URL: process.env.TEST_DB_URI,
            },
        },
    )

    return async () => {
        console.log('Stopping PostgreSQL container...')
        await postgresContainer?.stop()
    }
}
