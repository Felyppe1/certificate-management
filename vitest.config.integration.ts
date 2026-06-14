import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        include: ['src/**/*.integration.test.ts'],
        globalSetup: ['src/tests/global-setup.integration.ts'],
        setupFiles: ['src/tests/setup.integration.ts'],
        environment: 'node',
        env: {
            SKIP_ENV_VALIDATION: '1',
            NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
        },
    },
})
