import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        }
    },
    test: {
        globals: true,
        include: ["src/**/*.integration.test.ts"],
        setupFiles: ["src/tests/setup.integration.ts"],
        environment: "node",
    }
})
