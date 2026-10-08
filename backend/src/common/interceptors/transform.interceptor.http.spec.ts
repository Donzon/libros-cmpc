import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  INestApplication,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { SkipTransform } from '../decorators/skip-transform.decorator';
import { TransformInterceptor } from './transform.interceptor';

@Controller('probe')
class ProbeController {
  @Get('object')
  object(): { id: string } {
    return { id: '1' };
  }

  @Post('created')
  @HttpCode(201)
  created(): { id: string } {
    return { id: '1' };
  }

  @Get('list')
  list(): { data: Array<{ id: string }>; meta: { page: number; total: number } } {
    return { data: [{ id: '1' }], meta: { page: 1, total: 1 } };
  }

  @Get('csv')
  @SkipTransform()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  csv(): string {
    return 'title,author\nA,B';
  }

  @Delete('gone')
  @HttpCode(204)
  gone(): void {
    return undefined;
  }

  @Get('missing')
  missing(): never {
    throw new NotFoundException('no existe');
  }
}

describe('TransformInterceptor HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: TransformInterceptor,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET JSON → envelope con success y data', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/probe/object')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: { id: '1' },
      statusCode: 200,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      path: '/api/probe/object',
    });
  });

  it('POST 201 → statusCode 201 en el envelope', async () => {
    const response = await request(app.getHttpServer() as App)
      .post('/api/probe/created')
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.statusCode).toBe(201);
    expect(response.body.data).toEqual({ id: '1' });
  });

  it('listado paginado no anida data.data', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/probe/list')
      .expect(200);

    expect(response.body.data).toEqual([{ id: '1' }]);
    expect(response.body.meta).toEqual({ page: 1, total: 1 });
    expect(response.body.data.data).toBeUndefined();
  });

  it('CSV con @SkipTransform permanece text/csv', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/probe/csv')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.text).toBe('title,author\nA,B');
    expect(response.body.success).toBeUndefined();
  });

  it('DELETE 204 no envía envelope', async () => {
    const response = await request(app.getHttpServer() as App)
      .delete('/api/probe/gone')
      .expect(204);

    expect(response.text).toBe('');
  });

  it('404 sigue el formato del filtro global', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/probe/missing')
      .expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      message: 'no existe',
      error: 'Not Found',
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      path: '/api/probe/missing',
    });
    expect(response.body.success).toBeUndefined();
  });
});
