import { RedisClient } from 'src/RedisClient';

export class RedisCache {
  private client: RedisClient;
  private keyCache: { [key: string]: string } = {};
  private setCache: { [key: string]: Set<string> } = {};
  private hashCache: { [key: string]: Record<string, string> } = {};

  private types: { [key: string]: 'string' | 'hash' | 'set' } = {};

  private static self: RedisCache;

  constructor(client: RedisClient) {
    this.client = client;
  }

  getRedis(): RedisClient {
    return this.client;
  }

  async add(key: string, value: string): Promise<string | null> {
    if (key in this.types && this.types[key] !== 'string') return null;
    const oldvar = await this.client.getset(key, value);
    this.keyCache[key] = value;
    this.types[key] = 'string';

    return oldvar;
  }

  async sadd(key: string, value: string[]): Promise<number> {
    if (key in this.types && this.types[key] !== 'set') return 0;

    const result = await this.client.sadd(key, ...value);
    this.types[key] = 'set';
    if (result == 0) return 0;

    if (!(key in this.setCache) || !(this.setCache[key] instanceof Set))
      this.setCache[key] = new Set<string>();
    value.forEach(v => this.setCache[key].add(v));
    return result;
  }

  async hadd(key: string, field: string, value: string): Promise<number> {
    if (key in this.types && this.types[key] !== 'hash') return 0;
    const result = await this.client.hset(key, field, value);
    this.types[key] = 'hash';
    if (result == 0) return 0;

    if (!(key in this.hashCache)) this.hashCache[key] = {};
    this.hashCache[key][field] = value;
    return result;
  }

  async get(key: string): Promise<string | null> {
    if (key in this.keyCache && this.types[key] === 'string') {
      return this.keyCache[key];
    }

    const value = await this.client.get(key);
    if (value == null) return null;

    this.keyCache[key] = value;
    this.types[key] = 'string';
    return value;
  }

  async sget(key: string): Promise<Set<string> | null> {
    if (key in this.setCache && this.types[key] === 'set') {
      return this.setCache[key];
    }

    const type = await this.client.type(key);
    if (type !== 'set') return null;

    const value = new Set<string>(await this.client.smembers(key));
    this.types[key] = 'set';
    this.setCache[key] = value;
    return value;
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (
      key in this.hashCache &&
      field in this.hashCache[key] &&
      this.types[key] == 'hash'
    ) {
      return this.hashCache[key][field];
    }

    const type = await this.client.type(key);
    if (type !== 'hash') return null;

    const hash = await this.client.hgetall(key);
    this.types[key] = 'hash';
    this.hashCache[key] = hash;
    return hash[field];
  }

  async hgetall(
    key: string,
  ): Promise<{ [field: string]: string | null } | null> {
    if (key in this.hashCache && this.types[key] === 'hash') {
      return this.hashCache[key];
    }

    const type = await this.client.type(key);
    if (type !== 'hash') return null;

    const hash = await this.client.hgetall(key);
    this.types[key] = 'hash';
    this.hashCache[key] = hash;
    return hash;
  }

  async del(key: string, ...values: string[]): Promise<number> {
    if (key in this.types) delete this.types[key];
    const type = await this.client.type(key);
    if (type === 'set' && values.length > 0) {
      const result = await this.client.srem(key, ...values);
      values.forEach(value => this.setCache[key].delete(value));
      return result;
    } else if (type === 'hash' && values.length > 0) {
      const result = await this.client.hdel(key, ...values);
      values.forEach(value => delete this.hashCache[key][value]);
      return result;
    } else if (type === 'string' || values.length === 0) {
      const result = await this.client.del(key);
      delete this.keyCache[key];
      delete this.setCache[key];
      delete this.hashCache[key];
      return result;
    } else {
      return 0;
    }
  }
}
