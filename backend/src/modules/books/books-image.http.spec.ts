import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureStaticUploads } from '../../common/static-uploads';
import { BooksModule } from './books.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

function jpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
}

function pngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

describe('Books HTTP (image upload + static /uploads)', () => {
  const originalEnv = { ...process.env };
  const password = 'Admin123!';
  let user: User;
  let app: INestApplication;
  let accessToken: string;
  let uploadDir: string;

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

  const findFirst = jest.fn();
  const update = jest.fn();

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
  };

  function withRelations(book: typeof store) {
    return { ...book, author, publisher, genre };
  }

  beforeAll(async () => {
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmpc-img-http-'));

    process.env.DATABASE_URL =
      'postgresql://cmpc:cmpc@localhost:5432/cmpc_libros';
    process.env.JWT_SECRET =
      'change-me-use-a-random-string-at-least-32-chars';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.PORT = '3000';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.UPLOAD_DIR = uploadDir;
    process.env.MAX_IMAGE_BYTES = '64';

    const passwordHash = await bcrypt.hash(password, 4);
    user = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@cmpc.local',
      passwordHash,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    store = {
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
    };

    findFirst.mockImplementation(
      async ({ where }: { where: { id: string; deletedAt: null } }) => {
        if (
          store.id !== where.id ||
          store.deletedAt !== null
        ) {
          return null;
        }
        return withRelations(store);
      },
    );

    update.mockImplementation(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        if (store.id !== where.id || store.deletedAt !== null) {
          return null;
        }
        store = {
          ...store,
          ...(data.imagePath !== undefined
            ? { imagePath: data.imagePath as string }
            : {}),
          updatedAt: new Date('2026-09-29T12:00:00.000Z'),
        };
        return withRelations(store);
      },
    );

    const { AppConfigModule } = await import('../config/config.module');
    const { AuthModule } = await import('../auth/auth.module');
    const { UsersService } = await import('../users/users.service');
    const { JwtAuthGuard } = await import('../auth/jwt-auth.guard');

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
        book: { findFirst, update },
        $transaction: jest.fn(
          async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              book: { findFirst, update },
              auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
            };
            return callback(tx);
          },
        ),
      })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    configureStaticUploads(app as NestExpressApplication, uploadDir);
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
    await fs.rm(uploadDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  beforeEach(() => {
    store = {
      ...store,
      imagePath: null,
      deletedAt: null,
    };
    findFirst.mockClear();
    update.mockClear();
  });

  it('POST /api/books/:id/image guarda JPEG y devuelve imageUrl', async () => {
    const response = await request(app.getHttpServer() as App)
      .post(`/api/books/${bookId}/image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', jpegBuffer(), {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(response.body.imagePath).toMatch(
      new RegExp(`^books/${bookId}-\\d+\\.jpg$`),
    );
    expect(response.body.imageUrl).toBe(`/uploads/${response.body.imagePath}`);

    const absolute = path.join(uploadDir, response.body.imagePath as string);
    const stored = await fs.readFile(absolute);
    expect(stored.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(
      true,
    );

    await request(app.getHttpServer() as App)
      .get(response.body.imageUrl as string)
      .expect(200);
  });

  it('segundo upload borra el archivo anterior', async () => {
    const first = await request(app.getHttpServer() as App)
      .post(`/api/books/${bookId}/image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', jpegBuffer(), {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    const firstPath = path.join(uploadDir, first.body.imagePath as string);
    expect(await fs.access(firstPath).then(() => true)).toBe(true);

    const second = await request(app.getHttpServer() as App)
      .post(`/api/books/${bookId}/image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', pngBuffer(), {
        filename: 'cover.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(second.body.imagePath).toMatch(
      new RegExp(`^books/${bookId}-\\d+\\.png$`),
    );
    await expect(fs.access(firstPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('libro soft-deleted → 404', async () => {
    store.deletedAt = new Date('2026-09-29T12:00:00.000Z');

    await request(app.getHttpServer() as App)
      .post(`/api/books/${bookId}/image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', jpegBuffer(), {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(404);
  });

  it('oversize → 400', async () => {
    const big = Buffer.concat([jpegBuffer(), Buffer.alloc(100)]);

    await request(app.getHttpServer() as App)
      .post(`/api/books/${bookId}/image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', big, {
        filename: 'big.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
  });

  it('texto/PDF → 400', async () => {
    await request(app.getHttpServer() as App)
      .post(`/api/books/${bookId}/image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });

  it('sin JWT → 401', async () => {
    await request(app.getHttpServer() as App)
      .post(`/api/books/${bookId}/image`)
      .attach('file', jpegBuffer(), {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(401);
  });

  it('GET /uploads rechaza path traversal', async () => {
    const marker = path.join(uploadDir, 'secret.txt');
    await fs.writeFile(marker, 'secret');

    const outside = path.join(uploadDir, '..', 'outside-secret.txt');
    await fs.writeFile(outside, 'outside');

    await request(app.getHttpServer() as App)
      .get('/uploads/../outside-secret.txt')
      .expect((res) => {
        expect([403, 404]).toContain(res.status);
        expect(res.text).not.toContain('outside');
      });

    await fs.rm(outside, { force: true });
  });
});
