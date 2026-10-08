import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../../shared/api/http-client';
import { loginRequest } from './auth.api';

describe('loginRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /auth/login y retorna accessToken', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accessToken: 'jwt.token.here', expiresIn: '30m' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const result = await loginRequest(
      { email: 'admin@cmpc.local', password: 'secret' },
      { baseUrl: 'http://localhost:3000/api', fetchImpl },
    );

    expect(result).toEqual({
      accessToken: 'jwt.token.here',
      expiresIn: '30m',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@cmpc.local',
          password: 'secret',
        }),
      }),
    );
  });

  it('desenvuelve el envelope { success, data } del TransformInterceptor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { accessToken: 'jwt.token.here', expiresIn: '30m' },
          statusCode: 200,
          timestamp: '2026-10-08T13:00:00.000Z',
          path: '/api/auth/login',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(
      loginRequest(
        { email: 'admin@cmpc.local', password: 'secret' },
        { baseUrl: 'http://localhost:3000/api', fetchImpl },
      ),
    ).resolves.toEqual({
      accessToken: 'jwt.token.here',
      expiresIn: '30m',
    });
  });

  it('credenciales inválidas → HttpError 401', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized', statusCode: 401 }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      loginRequest(
        { email: 'admin@cmpc.local', password: 'wrong' },
        { baseUrl: 'http://localhost:3000/api', fetchImpl },
      ),
    ).rejects.toMatchObject({
      name: 'HttpError',
      status: 401,
    } satisfies Partial<HttpError>);
  });

  it('parsea message array y cae a texto genérico si no hay JSON', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: ['email inválido', 'password'] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response('nope', { status: 500 }));

    await expect(
      loginRequest(
        { email: 'x', password: 'y' },
        { baseUrl: 'http://localhost:3000/api', fetchImpl },
      ),
    ).rejects.toMatchObject({ message: 'email inválido, password' });

    await expect(
      loginRequest(
        { email: 'x', password: 'y' },
        { baseUrl: 'http://localhost:3000/api', fetchImpl },
      ),
    ).rejects.toMatchObject({
      message: 'Request failed with status 500',
    });
  });
});
