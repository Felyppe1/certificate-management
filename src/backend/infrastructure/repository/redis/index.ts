import Redis from 'redis'

const redisClient = await Redis.createClient({
    url: 'redis://localhost:6379',
})
    .on('error', err => console.log('Redis Client Error', err))
    .connect()

export { redisClient }
