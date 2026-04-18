import { defineConfig } from 'vitest/config'
import path from 'path'
// import { loadEnvFile } from 'process'

// loadEnvFile('.env.test')

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'node',
        setupFiles: ['./src/tests/setup.unit.ts'],
        include: ['src/**/*.test.ts'],
        exclude: ['src/**/*.integration.test.ts', 'src/**/*.e2e.test.ts', 'node_modules'], 
    },
})