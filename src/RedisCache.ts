import { RedisClient } from './RedisClient';

export class RedisCache {
    private client: RedisClient;
    private localCache: { [key: string]: string | null } = {};

    private static self: RedisCache | null;

    private constructor(client: RedisClient) {
        this.client = client;
    }

    public static getInstance(client: RedisClient) {
        if (!RedisCache.self) {
            RedisCache.self = new RedisCache(client);
        }
        return RedisCache.self;
    }

    async write(key: string, value: string): Promise<void> {
        await this.client.set(key, value);
        this.localCache[key] = value;
    }

    async read(key: string): Promise<string | null> {
        if (key in this.localCache) {
            return this.localCache[key];
        }

        const value = await this.client.get(key);
        this.localCache[key] = value;
        return value;
    }
}
