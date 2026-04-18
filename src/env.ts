import { z } from 'zod'
import { validateData } from './utils/zod-validator'

const serverSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),
    NEXT_RUNTIME: z.enum(['nodejs', 'edge']).optional(),

    DB_URL: z.string().min(1),
    DB_DIRECT_URL: z.string(),
    REDIS_URL: z.string().min(1),

    GCP_PROJECT_ID: z.string().min(1),
    GCP_PROJECT_NUMBER: z.string(),
    GCP_REGION: z.string(),
    SUFFIX: z.string().default(''),

    CLOUD_RUN_APP_URL: z.string(),
    CLOUD_FUNCTIONS_SA_EMAIL: z.string(),
    CERTIFICATES_BUCKET: z.string(),

    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    RESEND_API_KEY: z.string(),
    OWNER_EMAIL: z.string(),

    // Test variables
    TEST_DB_USERNAME: z.string().optional(),
    TEST_DB_PASSWORD: z.string().optional(),
    TEST_DB_HOST: z.string().optional(),
    TEST_DB_PORT: z.string().optional(),
    TEST_DB_URI: z.string().optional(),
    TEST_DB_NAME: z.string().optional(),
})

const clientSchema = z.object({
    NEXT_PUBLIC_BASE_URL: z.url(),
})

type ServerEnv = z.infer<typeof serverSchema>
type ClientEnv = z.infer<typeof clientSchema>

const isServer = typeof window === 'undefined'

const serverEnvs = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    DB_URL: process.env.DB_URL,
    DB_DIRECT_URL: process.env.DB_DIRECT_URL,
    REDIS_URL: process.env.REDIS_URL,
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
    GCP_PROJECT_NUMBER: process.env.GCP_PROJECT_NUMBER,
    GCP_REGION: process.env.GCP_REGION,
    SUFFIX: process.env.SUFFIX,
    CLOUD_RUN_APP_URL: process.env.CLOUD_RUN_APP_URL,
    CLOUD_FUNCTIONS_SA_EMAIL: process.env.CLOUD_FUNCTIONS_SA_EMAIL,
    CERTIFICATES_BUCKET: process.env.CERTIFICATES_BUCKET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,

    TEST_DB_USERNAME: process.env.TEST_DB_USERNAME,
    TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD,
    TEST_DB_HOST: process.env.TEST_DB_HOST,
    TEST_DB_PORT: process.env.TEST_DB_PORT,
    TEST_DB_URI: process.env.TEST_DB_URI,
    TEST_DB_NAME: process.env.TEST_DB_NAME,
}

const parsed = isServer
    ? validateData(serverSchema.extend(clientSchema.shape), serverEnvs)
    : validateData(clientSchema, {
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      })

if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.errors)

    if (!process.env.SKIP_ENV_VALIDATION) {
        throw new Error('Invalid environment variables')
    }
}

// Use a ternary operator to handle the skipped validation scenario safely
export const env = (parsed.success ? parsed.data : process.env) as ServerEnv &
    ClientEnv
