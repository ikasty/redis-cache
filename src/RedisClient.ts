export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<any>;
    del(...keys: string[]): Promise<number>;
    sadd(key: string, ...values: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    srem(key: string, ...values: string[]): Promise<number>;
    type(key: string): Promise<'none' | 'string' | 'list' | 'set' | 'zset' | 'hash'>;
}
