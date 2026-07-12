import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
    schema: 'src/backend/infrastructure/repository/prisma/schema.prisma',
    migrations: {
        path: 'src/backend/infrastructure/repository/prisma/migrations',
    },
    typedSql: {
        path: 'src/backend/infrastructure/repository/prisma/sql',
    },
    datasource: {
        url: env('DB_URL'),
    },
})
