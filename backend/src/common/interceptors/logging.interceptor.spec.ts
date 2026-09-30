import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AuthenticatedUser } from '../../modules/auth/jwt.strategy';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createContext(options: {
    method?: string;
    url?: string;
    statusCode?: number;
    user?: AuthenticatedUser;
  } = {}): ExecutionContext {
    const {
      method = 'GET',
      url = '/api/books',
      statusCode = 200,
      user,
    } = options;

    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url, user }),
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  }

  function createHandler(source: CallHandler['handle']): CallHandler {
    return { handle: source } as CallHandler;
  }

  it('registra método, ruta, status y latencia en una respuesta exitosa', async () => {
    const payload = { items: [], total: 0 };
    const result = await firstValueFrom(
      interceptor.intercept(
        createContext({ method: 'GET', url: '/api/books', statusCode: 200 }),
        createHandler(() => of(payload)),
      ),
    );

    expect(result).toBe(payload);
    expect(warn).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toMatch(/^GET \/api\/books 200 \+\d+ms$/);
  });

  it('agrega el userId cuando la request está autenticada', async () => {
    await firstValueFrom(
      interceptor.intercept(
        createContext({
          method: 'POST',
          url: '/api/books',
          statusCode: 201,
          user: { userId: 'user-1', email: 'admin@cmpc.cl' },
        }),
        createHandler(() => of({ id: 'book-1' })),
      ),
    );

    expect(log.mock.calls[0][0]).toContain('user=user-1');
  });

  it('re-lanza la excepción sin transformarla y la registra con su status', async () => {
    const exception = new ForbiddenException('Sin permisos');

    await expect(
      firstValueFrom(
        interceptor.intercept(
          createContext({ method: 'DELETE', url: '/api/books/1' }),
          createHandler(() => throwError(() => exception)),
        ),
      ),
    ).rejects.toBe(exception);

    expect(log).not.toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toMatch(/^DELETE \/api\/books\/1 403 \+\d+ms$/);
  });

  it('registra 500 para errores que no son HttpException', async () => {
    await expect(
      firstValueFrom(
        interceptor.intercept(
          createContext({ method: 'GET', url: '/api/books' }),
          createHandler(() => throwError(() => new Error('boom'))),
        ),
      ),
    ).rejects.toThrow('boom');

    expect(warn.mock.calls[0][0]).toContain('500');
  });
});
