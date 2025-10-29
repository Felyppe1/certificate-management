import { defineConfig } from 'vitest/config'
import path from 'path'
import { loadEnvFile } from 'process'

loadEnvFile('.env.test')

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
    },
})
