import { Client } from 'pg'

let client: Client | null = null

export async function getPostgresListener() {
    console.log('client:', client)

    if (client) return client

    client = new Client({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        application_name: 'certificate-management-listener',
        // ...(process.env.NODE_ENV === 'production'
        //     ? {
        //           ssl: {
        //               rejectUnauthorized: true,
        //               ca: process.env.DB_CA?.replace(/\\n/g, '\n'),
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
