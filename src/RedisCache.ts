import { RedisClient } from './RedisClient';

export class RedisCache {
    private client: RedisClient;
    private localCache: { [key: string]: string | Set<string> | null } = {};

    private static self: RedisCache;

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
        if (!RedisCache.self) {
            throw "redis cache not set"
        }
        return RedisCache.self;
    }

    async set(key: string, value: string | string[]): Promise<void> {
        if (Array.isArray(value)) {
            await this.client.sadd(key, ...value)
            this.localCache[key] = new Set(value)
        } else {
            await this.client.set(key, value);
            this.localCache[key] = value;
        }
    }

    async get(key: string): Promise<string | Set<string> | null> {
        if (key in this.localCache) {
            return this.localCache[key];
        }

        const type = await this.client.type(key);
        if (type === 'string') {
            const value = await this.client.get(key);
            this.localCache[key] = value;
            return value;
        } else if (type === 'set') {
            const value = new Set(await this.client.smembers(key));
            this.localCache[key] = value;
            return value;
        } else {
            return null;
        }
    }

    async del(key: string, ...values: string[]): Promise<void> {
        const type = await this.client.type(key);
        if (type === 'set' && values.length > 0) {
            await this.client.srem(key, ...values);
            values.forEach(value => {
                (this.localCache[key] as Set<string>).delete(value);
            });
        } else if (type === 'string' || values.length === 0) {
            await this.client.del(key);
            delete this.localCache[key];
        } else {
            return;
        }
    }
}
