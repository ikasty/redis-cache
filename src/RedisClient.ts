export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<any>;
}
  