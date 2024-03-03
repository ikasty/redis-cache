export interface RedisClient {
  type(key: string): Promise<string>;
  // Promise<'none' | 'string' | 'list' | 'set' | 'zset' | 'hash'>;

  get(key: string): Promise<string | null>;
  getset(key: string, value: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;

  sadd(key: string, ...values: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...values: string[]): Promise<number>;

  hset(key: string, field: string, value: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<{ [field: string]: string }>;
  hdel(key: string, ...fields: string[]): Promise<number>;
}