import { Client } from 'pg'

let client: Client | null = null

export async function getPostgresListener() {
    if (!client) {
        client = new Client({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            database: process.env.DB_NAME,
        })
    }

    await client.connect()

    await client.query('LISTEN outbox_changes')
    console.log('Listening to outbox changes')

    client.on('notification', message => {
        console.log('Received notification:', message.channel, message.payload)
    })

    return client
}
