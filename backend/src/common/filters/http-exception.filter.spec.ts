import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function createHost(url = '/api/books') {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url }),
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  }

  it('serializa HttpException al formato uniforme del diseño', () => {
    const { host, status, json } = createHost('/api/books');

    filter.catch(
      new BadRequestException({
        message: ['title must be a string'],
        error: 'Bad Request',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['title must be a string'],
        error: 'Bad Request',
        path: '/api/books',
      }),
    );

    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      ['error', 'message', 'path', 'statusCode', 'timestamp'].sort(),
    );
    expect(typeof body.timestamp).toBe('string');
  });

  it('mapea errores no HTTP a 500 genérico', () => {
    const { host, status, json } = createHost('/api/health');

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        path: '/api/health',
      }),
    );
  });
});
