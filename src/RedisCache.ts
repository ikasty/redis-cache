import { RedisClient } from './RedisClient';

export class RedisCache {
    private client: RedisClient;
    private keyCache: { [key: string]: string | null } = {};
    private setCache: { [key: string]: Set<string> } = {};
    private hashCache: { [key: string]: Record<string, string> } = {};

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
        await this.client.sadd(key, ...value);
        this.setCache[key] = new Set(value);
    }

    async hadd(key: string, field: string, value: string) {
        await this.client.hset(key, field, value);
        this.hashCache[key][field] = value;
    }

    async get(key: string): Promise<string | null> {
        if (key in this.keyCache) {
            return this.keyCache[key];
        }

        const type = await this.client.type(key);
        if (type !== 'string') return null;

        const value = await this.client.get(key);
        this.keyCache[key] = value;
        return value;
    }

    async sget(key: string): Promise<Set<string> | null> {
        if (key in this.setCache) {
            return this.setCache[key];
        }

        const type = await this.client.type(key);
        if (type !== 'set') return null;

        const value = new Set(await this.client.smembers(key));
        this.setCache[key] = value;
        return value;
    }

    async hget(key: string, field: string): Promise<string | number | null> {
        if (key in this.hashCache && field in this.hashCache[key]) {
            return this.hashCache[key][field];
        }

        const type = await this.client.type(key);
        if (type !== 'hash') return null;

        const value = await this.client.hget(key, field);
        if (value) this.hashCache[key][field] = value;
        return value;
    }

    async hgetall(key: string): Promise<{[field: string]: string | null} | null> {
        if (key in this.hashCache) {
            return this.hashCache[key];
        }

        const type = await this.client.type(key);
        if (type !== 'hash') return null;
        const hash = await this.client.hgetall(key);
        this.hashCache[key] = hash;
        return hash;
    }

    async del(key: string, ...values: string[]): Promise<void> {
        const type = await this.client.type(key);
        if (type === 'set' && values.length > 0) {
            await this.client.srem(key, ...values);
            values.forEach(value => this.setCache[key].delete(value));
        } else if (type === 'hash' && values.length > 0) {
            await this.client.hdel(key, ...values);
            values.forEach(value => delete this.hashCache[key][value]);
        } else if (type === 'string' || values.length === 0) {
            await this.client.del(key);
            delete this.keyCache[key];
            delete this.setCache[key];
            delete this.hashCache[key];
        } else {
            return;
        }
    }
}
