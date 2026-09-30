import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import helmet from 'helmet';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../modules/prisma/prisma.service';
import { configureSwagger } from './swagger';

type OpenApiDoc = {
  info: { title: string };
  paths: Record<string, Record<string, { security?: unknown[] }>>;
  components: { securitySchemes: Record<string, { scheme: string }> };
};

describe('Swagger /api/docs (smoke)', () => {
  const originalEnv = { ...process.env };
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgresql://cmpc:cmpc@localhost:5432/cmpc_libros';
    process.env.JWT_SECRET =
      'change-me-use-a-random-string-at-least-32-chars';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.PORT = '3000';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.UPLOAD_DIR = './uploads';
    process.env.MAX_IMAGE_BYTES = '2097152';

    const { AppModule } = await import('../app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(helmet());
    app.setGlobalPrefix('api');
    configureSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
  });

  it('GET /api/docs responde 200 con Swagger UI sin token', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/docs')
      .redirects(1)
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('swagger-ui');
  });

  it('GET /api/docs-json expone el documento OpenAPI con todas las rutas', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/docs-json')
      .expect(200);

    const doc = response.body as OpenApiDoc;
    expect(doc.info.title).toBe('CMPC-libros API');
    expect(Object.keys(doc.paths).sort()).toEqual(
      [
        '/api/auth/login',
        '/api/authors',
        '/api/books',
        '/api/books/export/csv',
        '/api/books/{id}',
        '/api/books/{id}/image',
        '/api/genres',
        '/api/health',
        '/api/publishers',
      ].sort(),
    );
    expect(Object.keys(doc.paths['/api/authors'])).toEqual(
      expect.arrayContaining(['get', 'post']),
    );
    expect(Object.keys(doc.paths['/api/books'])).toEqual(
      expect.arrayContaining(['get', 'post']),
    );
    expect(Object.keys(doc.paths['/api/books/{id}'])).toEqual(
      expect.arrayContaining(['get', 'patch', 'delete']),
    );
  });

  it('declara Bearer JWT en rutas protegidas y no en las públicas', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/docs-json')
      .expect(200);

    const doc = response.body as OpenApiDoc;
    expect(Object.values(doc.components.securitySchemes)).toEqual(
      expect.arrayContaining([expect.objectContaining({ scheme: 'bearer' })]),
    );
    expect(doc.paths['/api/books'].get.security).toBeDefined();
    expect(doc.paths['/api/auth/login'].post.security).toBeUndefined();
    expect(doc.paths['/api/health'].get.security).toBeUndefined();
  });
});
