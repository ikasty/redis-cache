import { RedisCache } from 'src/RedisCache';
import Redis from 'ioredis';
import redisMock from 'ioredis-mock';

describe('redis cache', () => {
  let redis: Redis;
  let redisCache: RedisCache;

  beforeEach(() => {
    redis = new redisMock();
    redisCache = new RedisCache(redis);
  });
  afterEach(async () => await redis.flushall());

  it('creates same redis', () => {
    expect(redisCache.getRedis()).toBe(redis);
  });

  it('key series check', async () => {
    await redisCache.add('key', 'value');
    expect(await redis.get('key')).toBe('value');

    expect(await redisCache.add('key', 'newvalue')).toBe('value');
    expect(await redis.get('key')).toBe('newvalue');

    await redisCache.del('unknown-key');
    expect(await redis.get('key')).toBe('newvalue');

    await redisCache.del('key');
    expect(await redis.get('key')).toBeNull();
  });

  it('hash series check', async () => {
    await redisCache.hadd('key', 'field', 'value');
    expect(await redis.hget('key', 'field')).toBe('value');

    await redisCache.hadd('key', '한글테스트', '한글 띄어쓰기');
    expect(await redis.hget('key', '한글테스트')).toBe('한글 띄어쓰기');
    expect(await redis.hgetall('key')).toEqual({
      field: 'value',
      한글테스트: '한글 띄어쓰기',
    });

    await redisCache.del('key', 'field');
    expect(await redis.hget('key', 'field')).toBeNull();
    expect(await redis.hget('key', '한글테스트')).toBe('한글 띄어쓰기');

    await redisCache.del('key', 'unknown-field');
    expect(await redis.hget('key', '한글테스트')).toBe('한글 띄어쓰기');
  });

  it('set series check', async () => {
    expect(await redisCache.sadd('set-key', ['value'])).toBe(1);
    expect(await redis.smembers('set-key')).toEqual(['value']);

    expect(await redisCache.sadd('set-key', ['value'])).toBe(0);
    expect(await redis.smembers('set-key')).toEqual(['value']);

    expect(await redisCache.sadd('set-key', ['value', 'value1'])).toBe(1);
    expect(new Set(await redis.smembers('set-key'))).toEqual(
      new Set(['value1', 'value']),
    );

    await redisCache.del('set-key', 'value1', 'value2');
    expect(await redis.smembers('set-key')).toEqual(['value']);
  });

  it('restarts cache', async () => {
    await redisCache.add('key', 'value');
    await redisCache.hadd('hash-key', 'field', 'value');
    await redisCache.hadd('hash-key-2', 'field', 'value');
    await redisCache.sadd('set-key', ['value']);

    redisCache = new RedisCache(redis);
    expect(await redisCache.get('key')).toBe('value');
    expect(await redisCache.hget('hash-key', 'field')).toBe('value');
    expect(await redisCache.hgetall('hash-key-2')).toEqual({ field: 'value' });
    expect(await redisCache.sget('set-key')).toEqual(new Set(['value']));
  });

  it('key crashed', async () => {
    await redisCache.add('key', 'value');
    expect(await redisCache.hadd('key', 'field', 'value')).toBe(0);
    expect(await redisCache.sadd('key', ['value'])).toBe(0);

    expect(await redisCache.hadd('hash-key', 'field', 'value')).toBe(1);
    expect(await redisCache.hadd('hash-key', 'field', 'value2')).toBe(0);
    expect(await redisCache.hadd('hash-key', 'field2', 'value2')).toBe(1);
    expect(await redisCache.add('hash-key', 'value')).toBeNull();
    expect(await redisCache.sadd('hash-key', ['value'])).toBe(0);

    expect(await redisCache.sadd('set-key', ['value'])).toBe(1);
    expect(await redisCache.add('set-key', 'value')).toBeNull();
    expect(await redisCache.hadd('set-key', 'field', 'value')).toBe(0);
  });
});
