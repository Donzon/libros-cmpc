import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, User } from '@prisma/client';
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

describe('Books HTTP (CRUD + soft delete)', () => {
  const originalEnv = { ...process.env };
  const password = 'Admin123!';
  let user: User;
  let app: INestApplication;
  let accessToken: string;

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

  const create = jest.fn();
  const findFirst = jest.fn();
  const findMany = jest.fn();
  const update = jest.fn();
  const count = jest.fn();

  let store: {
    id: string;
    title: string;
    price: Prisma.Decimal;
    available: boolean;
    imagePath: string | null;
    authorId: string;
    publisherId: string;
    genreId: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;

  function withRelations(book: NonNullable<typeof store>) {
    return { ...book, author, publisher, genre };
  }

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

    const { AppConfigModule } = await import('../config/config.module');
    const { AuthModule } = await import('../auth/auth.module');
    const { UsersService } = await import('../users/users.service');
    const { JwtAuthGuard } = await import('../auth/jwt-auth.guard');

    create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      store = {
        id: bookId,
        title: data.title as string,
        price: new Prisma.Decimal(data.price as string),
        available: data.available as boolean,
        imagePath: null,
        authorId: data.authorId as string,
        publisherId: data.publisherId as string,
        genreId: data.genreId as string,
        deletedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      return withRelations(store);
    });

    findFirst.mockImplementation(
      async ({ where }: { where: { id: string; deletedAt: null } }) => {
        if (
          !store ||
          store.id !== where.id ||
          store.deletedAt !== null
        ) {
          return null;
        }
        return withRelations(store);
      },
    );

    findMany.mockImplementation(async () => {
      if (!store || store.deletedAt !== null) {
        return [];
      }
      return [withRelations(store)];
    });

    count.mockImplementation(async () => {
      if (!store || store.deletedAt !== null) {
        return 0;
      }
      return 1;
    });

    update.mockImplementation(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        if (!store || store.id !== where.id) {
          return null;
        }
        store = {
          ...store,
          ...(data.title !== undefined ? { title: data.title as string } : {}),
          ...(data.price !== undefined
            ? { price: new Prisma.Decimal(data.price as string) }
            : {}),
          ...(data.available !== undefined
            ? { available: data.available as boolean }
            : {}),
          ...(data.deletedAt !== undefined
            ? { deletedAt: data.deletedAt as Date }
            : {}),
          updatedAt: new Date('2026-09-29T12:00:00.000Z'),
        };
        return withRelations(store);
      },
    );

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
        book: { create, findFirst, findMany, update, count },
        $transaction: jest.fn(
          async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              book: { create, findFirst, findMany, update, count },
              auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
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
    store = null;
    create.mockClear();
    findFirst.mockClear();
    findMany.mockClear();
    update.mockClear();
    count.mockClear();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  const createPayload = {
    title: 'La casa de los espíritus',
    price: '19.99',
    available: true,
    authorId: author.id,
    publisherId: publisher.id,
    genreId: genre.id,
  };

  it('GET /api/books sin token → 401', async () => {
    await request(app.getHttpServer() as App).get('/api/books').expect(401);
  });

  it('POST /api/books → 201 con price string', async () => {
    const response = await request(app.getHttpServer() as App)
      .post('/api/books')
      .set(auth())
      .send(createPayload)
      .expect(201);

    expect(response.body.id).toBe(bookId);
    expect(response.body.price).toBe('19.99');
    expect(typeof response.body.price).toBe('string');
    expect(response.body.author).toEqual(author);
    expect(response.body.imageUrl).toBeNull();
  });

  it('GET /api/books/:id → 200', async () => {
    store = {
      id: bookId,
      title: createPayload.title,
      price: new Prisma.Decimal(createPayload.price),
      available: true,
      imagePath: null,
      authorId: author.id,
      publisherId: publisher.id,
      genreId: genre.id,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const response = await request(app.getHttpServer() as App)
      .get(`/api/books/${bookId}`)
      .set(auth())
      .expect(200);

    expect(response.body.id).toBe(bookId);
    expect(response.body.price).toBe('19.99');
  });

  it('PATCH /api/books/:id → 200', async () => {
    store = {
      id: bookId,
      title: createPayload.title,
      price: new Prisma.Decimal(createPayload.price),
      available: true,
      imagePath: null,
      authorId: author.id,
      publisherId: publisher.id,
      genreId: genre.id,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const response = await request(app.getHttpServer() as App)
      .patch(`/api/books/${bookId}`)
      .set(auth())
      .send({ title: 'Título editado', price: '29.90' })
      .expect(200);

    expect(response.body.title).toBe('Título editado');
    expect(response.body.price).toBe('29.90');
  });

  it('DELETE /api/books/:id → 204 y luego GET → 404', async () => {
    store = {
      id: bookId,
      title: createPayload.title,
      price: new Prisma.Decimal(createPayload.price),
      available: true,
      imagePath: null,
      authorId: author.id,
      publisherId: publisher.id,
      genreId: genre.id,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    await request(app.getHttpServer() as App)
      .delete(`/api/books/${bookId}`)
      .set(auth())
      .expect(204);

    expect(store?.deletedAt).not.toBeNull();

    await request(app.getHttpServer() as App)
      .get(`/api/books/${bookId}`)
      .set(auth())
      .expect(404);
  });

  it('GET /api/books excluye soft-deleted y usa meta con defaults', async () => {
    store = {
      id: bookId,
      title: createPayload.title,
      price: new Prisma.Decimal(createPayload.price),
      available: true,
      imagePath: null,
      authorId: author.id,
      publisherId: publisher.id,
      genreId: genre.id,
      deletedAt: new Date('2026-09-29T12:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-29T12:00:00.000Z'),
    };

    const response = await request(app.getHttpServer() as App)
      .get('/api/books')
      .set(auth())
      .expect(200);

    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('GET /api/books acepta query params de listado avanzado', async () => {
    store = {
      id: bookId,
      title: createPayload.title,
      price: new Prisma.Decimal(createPayload.price),
      available: true,
      imagePath: null,
      authorId: author.id,
      publisherId: publisher.id,
      genreId: genre.id,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const response = await request(app.getHttpServer() as App)
      .get('/api/books')
      .query({
        page: 1,
        limit: 10,
        search: 'casa',
        genreId: genre.id,
        publisherId: publisher.id,
        authorId: author.id,
        available: true,
        sortBy: 'price',
        sortOrder: 'desc',
      })
      .set(auth())
      .expect(200);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          genreId: genre.id,
          publisherId: publisher.id,
          authorId: author.id,
          available: true,
          title: { contains: 'casa', mode: 'insensitive' },
        },
        orderBy: { price: 'desc' },
        skip: 0,
        take: 10,
      }),
    );
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });
});
