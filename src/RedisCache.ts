import { RedisClient } from './RedisClient';

export class RedisCache {
    private client: RedisClient;
    private keyCache: { [key: string]: string | null } = {};
    private setCache: { [key: string]: Set<string> }= {};

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

    async add(key: string, value: string): Promise<void> {
        await this.client.set(key, value);
        this.keyCache[key] = value;
    }

    async sadd(key: string, value: string[]): Promise<void> {
        await this.client.sadd(key, ...value)
        this.setCache[key] = new Set(value);
    }

    async get(key: string): Promise<string | null> {
        if (key in this.keyCache) {
            return this.keyCache[key];
        }

        const type = await this.client.type(key);
        if (type !== 'string') return Promise.reject();
        const value = await this.client.get(key);
        this.keyCache[key] = value;
        return value;
    }

    async sget(key: string): Promise<Set<string>> {
        if (key in this.setCache) {
            return this.setCache[key];
        }

        const type = await this.client.type(key);
        if (type !== 'set') return Promise.reject();
        const value = new Set(await this.client.smembers(key));
        this.setCache[key] = value;
        return value;
    }

    async del(key: string, ...values: string[]): Promise<void> {
        const type = await this.client.type(key);
        if (type === 'set' && values.length > 0) {
            await this.client.srem(key, ...values);
            values.forEach(value => {
                (this.setCache[key] as Set<string>).delete(value);
            });
        } else if (type === 'string' || values.length === 0) {
            await this.client.del(key);
            delete this.keyCache[key];
        } else {
            return;
        }
    }
}
