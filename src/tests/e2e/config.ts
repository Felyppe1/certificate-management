// Constants shared across the E2E suite (ports, database, base data).
// Centralizes what used to be duplicated between start-server.ts, fixtures.ts and the tests.

export const DB_HOST_PORT = 54332
export const DB_USERNAME = 'root'
export const DB_PASSWORD = 'password'
export const DB_NAME = 'testdb'
export const DB_URL = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@localhost:${DB_HOST_PORT}/${DB_NAME}?schema=public`

export const APP_PORT = 3001
export const BASE_URL = `http://localhost:${APP_PORT}`

// Default password used when creating test users, reused on login.
export const DEFAULT_PASSWORD = 'Senha@123'

export const PRISMA_SCHEMA_PATH =
    'src/backend/infrastructure/repository/prisma/schema.prisma'
