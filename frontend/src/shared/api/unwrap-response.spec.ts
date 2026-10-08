import { describe, expect, it } from 'vitest';
import { isApiSuccessEnvelope, unwrapApiResponse } from './unwrap-response';

describe('unwrapApiResponse', () => {
  it('desenvuelve data de un envelope simple', () => {
    const body = {
      success: true as const,
      data: { accessToken: 'jwt', expiresIn: '30m' },
      statusCode: 200,
      timestamp: '2026-10-08T13:00:00.000Z',
      path: '/api/auth/login',
    };

    expect(unwrapApiResponse(body)).toEqual({
      accessToken: 'jwt',
      expiresIn: '30m',
    });
  });

  it('devuelve { data, meta } cuando el envelope es paginado', () => {
    const body = {
      success: true as const,
      data: [{ id: '1' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      statusCode: 200,
      timestamp: '2026-10-08T13:00:00.000Z',
      path: '/api/books',
    };

    expect(unwrapApiResponse(body)).toEqual({
      data: [{ id: '1' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('deja pasar un body sin envelope (compatibilidad)', () => {
    expect(unwrapApiResponse({ ok: true })).toEqual({ ok: true });
    expect(isApiSuccessEnvelope({ ok: true })).toBe(false);
  });
});
