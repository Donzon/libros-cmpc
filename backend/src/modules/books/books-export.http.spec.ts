import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction, Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { BooksModule } from './books.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

function applyTestEnv(): void {
  process.env.DATABASE_URL =
    'postgresql://cmpc:cmpc@localhost:5432/cmpc_libros';
  process.env.JWT_SECRET =
    'change-me-use-a-random-string-at-least-32-chars';
  process.env.JWT_EXPIRES_IN = '30m';
  process.env.PORT = '3000';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.UPLOAD_DIR = './uploads';
  process.env.MAX_IMAGE_BYTES = '2097152';
}

describe('Books HTTP (export CSV)', () => {
  const originalEnv = { ...process.env };
  const password = 'Admin123!';
  let user: User;
  let app: INestApplication;
  let accessToken: string;
  let auditLogCreate: jest.Mock;

  const author = {
    id: 'a1111111-1111-4111-8111-111111111111',
    name: 'Allende',
  };
  const publisher = {
    id: 'b2222222-2222-4222-8222-222222222222',
    name: 'Planeta',
  };
  const genre = {
    id: 'c3333333-3333-4333-8333-333333333333',
    name: 'Ficción',
  };
  const bookId = 'd4444444-4444-4444-8444-444444444444';

  const findMany = jest.fn();

  beforeAll(async () => {
    applyTestEnv();
    const passwordHash = await bcrypt.hash(password, 4);
    user = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@cmpc.local',
      passwordHash,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    auditLogCreate = jest.fn().mockResolvedValue({ id: 'audit-export-1' });

    const { AppConfigModule } = await import('../config/config.module');
    const { AuthModule } = await import('../auth/auth.module');
    const { UsersService } = await import('../users/users.service');
    const { JwtAuthGuard } = await import('../auth/jwt-auth.guard');

    findMany.mockResolvedValue([
      {
        id: bookId,
        title: 'La casa de los espíritus',
        price: new Prisma.Decimal('19.99'),
        available: true,
        imagePath: null,
        authorId: author.id,
        publisherId: publisher.id,
        genreId: genre.id,
        deletedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        author,
        publisher,
        genre,
      },
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule, AuthModule, BooksModule],
      providers: [
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
      ],
    })
      .overrideProvider(UsersService)
      .useValue({
        findByEmail: jest.fn(async (email: string) =>
          email === user.email ? user : null,
        ),
        findById: jest.fn(async (id: string) =>
          id === user.id ? user : null,
        ),
      })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        book: { findMany },
        $transaction: jest.fn(
          async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              book: { findMany },
              auditLog: { create: auditLogCreate },
            };
            return callback(tx);
          },
        ),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const login = await request(app.getHttpServer() as App)
      .post('/api/auth/login')
      .send({ email: user.email, password })
      .expect(200);

    accessToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    process.env = originalEnv;
  });

  beforeEach(() => {
    findMany.mockClear();
    auditLogCreate.mockClear();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it('GET /api/books/export/csv sin token → 401', async () => {
    await request(app.getHttpServer() as App)
      .get('/api/books/export/csv')
      .expect(401);
  });

  it('GET /api/books/export/csv → 200 text/csv con columnas y audit EXPORT', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/books/export/csv')
      .query({
        search: 'casa',
        genreId: genre.id,
        available: true,
        sortBy: 'title',
        sortOrder: 'asc',
      })
      .set(auth())
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="books.csv"',
    );
    expect(response.text).toContain(
      'titulo,autor,editorial,genero,precio,disponibilidad',
    );
    expect(response.text).toContain(
      'La casa de los espíritus,Allende,Planeta,Ficción,19.99,true',
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          genreId: genre.id,
          available: true,
          title: { contains: 'casa', mode: 'insensitive' },
        },
        take: 10_000,
      }),
    );

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        action: AuditAction.EXPORT,
        entity: 'Book',
        entityId: null,
        metadata: {
          search: 'casa',
          genreId: genre.id,
          available: true,
          sortBy: 'title',
          sortOrder: 'asc',
        },
      },
    });
  });
});
