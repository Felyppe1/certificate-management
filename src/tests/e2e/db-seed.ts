import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'

// Seeds the base data that the system requires before any test runs.
//
// The domain currently has no mandatory fixed entities: users, emissions,
// templates and data sources are created dynamically by each test (with unique
// data via faker). This single entry point exists to conform to the skill's
// architecture and to centralize future seeds (e.g. plans, defaults).
export async function seedDatabase(_prisma: PrismaClient): Promise<void> {
    // No fixed base data at the moment.
}
