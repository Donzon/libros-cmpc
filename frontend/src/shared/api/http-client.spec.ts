import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient, UnauthorizedError } from './http-client';
import { createTokenStorage } from './token-storage';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
}

describe('createHttpClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adjunta Authorization Bearer cuando hay token', async () => {
    const storage = createTokenStorage(createMemoryStorage());
    storage.setAccessToken('test-token-123');

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createHttpClient({
      baseUrl: 'http://localhost:3000/api',
      getAccessToken: () => storage.getAccessToken(),
      clearAccessToken: () => storage.clearAccessToken(),
      fetchImpl,
    });

    await client.get('/books');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-token-123');
  });

  it('no adjunta Authorization si no hay token', async () => {
    const storage = createTokenStorage(createMemoryStorage());

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createHttpClient({
      baseUrl: 'http://localhost:3000/api',
      getAccessToken: () => storage.getAccessToken(),
      clearAccessToken: () => storage.clearAccessToken(),
      fetchImpl,
    });

    await client.get('/health');

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('ante 401 limpia el token y dispara onUnauthorized', async () => {
    const storage = createTokenStorage(createMemoryStorage());
    storage.setAccessToken('expired-token');
    const onUnauthorized = vi.fn();

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createHttpClient({
      baseUrl: 'http://localhost:3000/api',
      getAccessToken: () => storage.getAccessToken(),
      clearAccessToken: () => storage.clearAccessToken(),
      onUnauthorized,
      fetchImpl,
    });

    await expect(client.get('/books')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(storage.getAccessToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
