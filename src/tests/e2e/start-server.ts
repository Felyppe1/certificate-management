import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync, spawn } from 'child_process'
import {
    DB_HOST_PORT,
    DB_NAME,
    DB_PASSWORD,
    DB_URL,
    DB_USERNAME,
    PRISMA_SCHEMA_PATH,
} from './config'

// `webServer.command` entrypoint (playwright.config.ts): starts (or reuses) the
// fixed-port Postgres container used by the e2e suite, pushes the schema, builds
// the Next.js app, copies the assets required by `output: 'standalone'` (Next
// refuses `next start` in that mode) and starts the standalone server. All other
// env vars (PORT, GOOGLE_CLIENT_ID, etc.) already come from `webServer.env` in
// playwright.config.ts, inherited via `process.env`.
//
// The database must be ensured *before* `npm run build`: the build runs `prisma
// generate --sql`, which needs a live, schema-pushed database to introspect
// TypedSQL query types.
async function startServer() {
    console.log('Starting PostgreSQL container for E2E tests on fixed port...')

    // `withReuse()` is mandatory: without it, testcontainers would tear down the
    // container (Ryuk) as soon as this process exits, taking the database down
    // with it while the standalone server is still running.
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

    console.log('Building the Next.js application for E2E tests...')
    execSync('npm run build', { stdio: 'inherit', env: process.env })

    console.log('Copying static assets to the standalone folder...')
    execSync(
        [
            'rm -rf .next/standalone/.next/static .next/standalone/public',
            'cp -r .next/static .next/standalone/.next/static',
            'cp -r public .next/standalone/public',
            // Overwrites the standalone-traced node_modules with the full one: tracing
            // does not capture external packages' data files (e.g. @google-cloud/tasks'
            // protos.json, listed in serverExternalPackages), breaking at runtime.
            'cp -rf node_modules/. .next/standalone/node_modules/',
        ].join(' && '),
        { stdio: 'inherit', env: process.env },
    )

    console.log('Starting the Next.js standalone server...')
    const serverProcess = spawn('node', ['.next/standalone/server.js'], {
        stdio: 'inherit',
        env: process.env,
    })

    await new Promise(resolve => serverProcess.on('close', resolve))
}

startServer().catch(error => {
    console.error(error)
    process.exit(1)
})
