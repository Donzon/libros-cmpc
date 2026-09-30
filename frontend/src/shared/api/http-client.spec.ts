import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createHttpClient,
  getApiBaseUrl,
  HttpError,
  UnauthorizedError,
} from './http-client';
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

  it('post/patch/delete delegan en request con el método correcto', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createHttpClient({
      baseUrl: 'http://localhost:3000/api/',
      getAccessToken: () => null,
      clearAccessToken: () => undefined,
      fetchImpl,
    });

    await expect(client.post('/books', { title: 'A' })).resolves.toBeUndefined();
    await expect(client.patch('/books/1', { title: 'B' })).resolves.toBeUndefined();
    await expect(client.delete('/books/1')).resolves.toBeUndefined();

    expect(fetchImpl.mock.calls.map((c) => (c[1] as RequestInit).method)).toEqual([
      'POST',
      'PATCH',
      'DELETE',
    ]);
  });

  it('envía FormData sin forzar Content-Type JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    );
    const client = createHttpClient({
      baseUrl: 'http://localhost:3000/api',
      getAccessToken: () => null,
      clearAccessToken: () => undefined,
      fetchImpl,
    });
    const form = new FormData();
    form.append('file', new Blob(['x']), 'a.png');

    await expect(client.post('/books/1/image', form)).resolves.toBe('ok');
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
    expect(init.body).toBe(form);
  });

  it('HttpError usa message del body JSON (string o array)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Bad request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: ['a', 'b'] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const client = createHttpClient({
      baseUrl: 'http://localhost:3000/api',
      getAccessToken: () => null,
      clearAccessToken: () => undefined,
      fetchImpl,
    });

    await expect(client.get('/x')).rejects.toMatchObject({
      name: 'HttpError',
      message: 'Bad request',
      status: 400,
    } satisfies Partial<HttpError>);
    await expect(client.get('/y')).rejects.toMatchObject({
      message: 'a, b',
    });
  });

  it('getApiBaseUrl usa fallback local si no hay VITE_API_BASE_URL', () => {
    expect(getApiBaseUrl()).toMatch(/\/api$/);
  });
});
