const envConfig = {
    mongoUrl: process.env.MONGO_URL,
    port: process.env.PORT,
    jwtSecret: process.env.JWT_SECRET,
    openRouterKey: process.env.OPENROUTER_API_KEY,
    replicateToken: process.env.REPLICATE_KEY,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
    redisPassword: process.env.REDIS_PASSWORD,
    localhost: process.env.LOCALHOST,
    origin_host: process.env.ORIGIN_HOST,
}

export default envConfig
