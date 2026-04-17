import { Client } from 'pg'
import { env } from '@/env'

let client: Client | null = null

export async function getPostgresListener() {
    console.log('client:', client)

    if (client) return client

    client = new Client({
        connectionString: env.DB_URL,
        application_name: 'certificate-management-listener',
        // ...(env.NODE_ENV === 'production'
        //     ? {
        //           ssl: {
        //               rejectUnauthorized: true,
        //               ca: env.DB_CA.replace(/\\n/g, '\n'),
        //           },
        //       }
        //     : {}),
    })

    await client.connect()

    await client.query('LISTEN outbox_changes')
    console.log('Listening to outbox changes')

    client.on('notification', message => {
        console.log('Received notification:', message.channel, message.payload)
    })

    // locally, it has no effect
    process.on('SIGINT', async () => {
        if (client) {
            await client.end()
            console.log('Postgres listener disconnected')
        }

        process.exit(0)
    })

    return client
}
