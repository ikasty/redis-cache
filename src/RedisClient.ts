export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<any>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    rpush(key: string, ...values: string[]): Promise<number>;
}
  