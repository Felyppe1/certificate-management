import Redis from 'redis'

const redisClient = await Redis.createClient({
    url: process.env.REDIS_URL,
})
    .on('error', err => console.log('Redis Client Error', err))
    .connect()

export { redisClient }
