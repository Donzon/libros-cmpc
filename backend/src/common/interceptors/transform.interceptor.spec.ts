import {
  CallHandler,
  ExecutionContext,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    interceptor = new TransformInterceptor(reflector as unknown as Reflector);
  });

  function createContext(options: {
    path?: string;
    originalUrl?: string;
    statusCode?: number;
    contentType?: string;
  } = {}): ExecutionContext {
    const {
      path = '/api/books/1',
      originalUrl = path,
      statusCode = 200,
      contentType,
    } = options;

    const headers: Record<string, string> = {};
    if (contentType) {
      headers['content-type'] = contentType;
    }

    return {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ path, url: originalUrl, originalUrl }),
        getResponse: () => ({
          statusCode,
          get: (name: string) => headers[name.toLowerCase()],
        }),
      }),
    } as unknown as ExecutionContext;
  }

  function createHandler(source: CallHandler['handle']): CallHandler {
    return { handle: source } as CallHandler;
  }

  it('envuelve un objeto en { success, data, statusCode, timestamp, path }', async () => {
    const payload = { id: 'book-1', title: 'Rayuela' };
    const result = await firstValueFrom(
      interceptor.intercept(
        createContext({ path: '/api/books/1', statusCode: 200 }),
        createHandler(() => of(payload)),
      ),
    );

    expect(result).toEqual({
      success: true,
      data: payload,
      statusCode: 200,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      path: '/api/books/1',
    });
  });

  it('aplana un payload paginado { data, meta } sin anidar data.data', async () => {
    const payload = {
      data: [{ id: '1' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    const result = await firstValueFrom(
      interceptor.intercept(
        createContext({ path: '/api/books', originalUrl: '/api/books?page=1' }),
        createHandler(() => of(payload)),
      ),
    );

    expect(result).toEqual({
      success: true,
      data: payload.data,
      meta: payload.meta,
      statusCode: 200,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      path: '/api/books?page=1',
    });
  });

  it('refleja el status HTTP en statusCode (201)', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(
        createContext({ path: '/api/books', statusCode: 201 }),
        createHandler(() => of({ id: 'new' })),
      ),
    );

    expect(result).toMatchObject({ success: true, statusCode: 201, data: { id: 'new' } });
  });

  it('no envuelve un string (CSV)', async () => {
    const csv = 'title,author\nRayuela,Cortázar';
    const result = await firstValueFrom(
      interceptor.intercept(
        createContext({
          path: '/api/books/export/csv',
          contentType: 'text/csv; charset=utf-8',
        }),
        createHandler(() => of(csv)),
      ),
    );

    expect(result).toBe(csv);
  });

  it('no envuelve 204 (payload undefined)', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(
        createContext({ path: '/api/books/1', statusCode: 204 }),
        createHandler(() => of(undefined)),
      ),
    );

    expect(result).toBeUndefined();
  });

  it('respeta @SkipTransform', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const payload = { raw: true };

    const result = await firstValueFrom(
      interceptor.intercept(
        createContext(),
        createHandler(() => of(payload)),
      ),
    );

    expect(result).toBe(payload);
  });

  it('no envuelve rutas /docs (Swagger)', async () => {
    const doc = { openapi: '3.0.0', info: { title: 'API' }, paths: {} };
    const result = await firstValueFrom(
      interceptor.intercept(
        createContext({ path: '/api/docs-json' }),
        createHandler(() => of(doc)),
      ),
    );

    expect(result).toBe(doc);
  });

  it('no envuelve un StreamableFile', async () => {
    const file = new StreamableFile(Buffer.from('x'));
    const result = await firstValueFrom(
      interceptor.intercept(
        createContext(),
        createHandler(() => of(file)),
      ),
    );

    expect(result).toBe(file);
  });

  it('no vuelve a envolver un envelope ya formado', async () => {
    const envelope = {
      success: true as const,
      data: { id: '1' },
      statusCode: 200,
      timestamp: '2026-10-08T00:00:00.000Z',
      path: '/api/books/1',
    };

    const result = await firstValueFrom(
      interceptor.intercept(
        createContext(),
        createHandler(() => of(envelope)),
      ),
    );

    expect(result).toBe(envelope);
  });

  it('re-lanza excepciones sin transformarlas', async () => {
    const exception = new NotFoundException('no');

    await expect(
      firstValueFrom(
        interceptor.intercept(
          createContext(),
          createHandler(() => throwError(() => exception)),
        ),
      ),
    ).rejects.toBe(exception);
  });
});
