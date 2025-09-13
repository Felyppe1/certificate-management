import Redis from 'redis'

const redisClient = await Redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: retries => {
            if (retries > 10) {
                return new Error('Unable to connect to Redis')
            }

            return Math.min(retries * 50, 3000)
        },
    },
})
    .on('error', err => console.log('Redis Client Error', err))
    .connect()

export { redisClient }
