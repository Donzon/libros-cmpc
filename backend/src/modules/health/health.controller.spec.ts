import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let app: INestApplication;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: queryRaw,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health responde 200 con { status: "ok" }', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app.getHttpServer() as App)
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/health responde 503 si la DB no responde', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    await request(app.getHttpServer() as App)
      .get('/api/health')
      .expect(503);
  });

  it('check() lanza ServiceUnavailableException cuando falla el ping', async () => {
    queryRaw.mockRejectedValue(new Error('down'));
    const controller = app.get(HealthController);

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
