import { RedisClient } from './RedisClient';

export class RedisCache {
    private client: RedisClient;
    private localCache: { [key: string]: string | string[] | null } = {};

    private static self: RedisCache | null;

    private constructor(client: RedisClient) {
        this.client = client;
    }

    public static setInstance(client: RedisClient) {
        if (RedisCache.self) {
            throw "redis cache already setted"
        }
        RedisCache.self = new RedisCache(client);
    }

    public static getInstance() {
        return RedisCache.self;
    }

    async write(key: string, value: string): Promise<void> {
        if (Array.isArray(value)) {
            await this.client.rpush(key, ...value)
        } else {
            await this.client.set(key, value);
        }
        this.localCache[key] = value;
    }

    async read(key: string): Promise<string | String[] | null> {
        if (key in this.localCache) {
            return this.localCache[key];
        }

        const listValue = await this.client.lrange(key, 0, -1);
        if (listValue.length == 0) {
            const value = await this.client.get(key);
            this.localCache[key] = value;
            return value;
        }

        this.localCache[key] = listValue.length > 0 ? listValue : null;
        return this.localCache[key];
    }

    public getClient(): RedisClient {
        return this.client;
    }
}
