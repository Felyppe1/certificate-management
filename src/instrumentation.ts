export async function register() {
    console.log('Instrumentation started')

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { getPostgresListener } = await import(
            './backend/infrastructure/listener/pg'
        )

        await getPostgresListener()
    }
}
