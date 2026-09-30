import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { User } from '@prisma/client';
import { AuthorsModule } from './authors/authors.module';
import { PublishersModule } from './publishers/publishers.module';
import { GenresModule } from './genres/genres.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';

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

describe('Lookups HTTP (authors, publishers, genres)', () => {
  const originalEnv = { ...process.env };
  const password = 'Admin123!';
  let user: User;
  let app: INestApplication;
  let accessToken: string;

  const authors = [
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Bolaño' },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Allende' },
  ];
  const publishers = [
    { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Planeta' },
    { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Alfaguara' },
  ];
  const genres = [
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Historia' },
    { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name: 'Ficción' },
  ];

  const authorFindMany = jest.fn();
  const publisherFindMany = jest.fn();
  const genreFindMany = jest.fn();

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

    const { AppConfigModule } = await import('./config/config.module');
    const { AuthModule } = await import('./auth/auth.module');
    const { UsersService } = await import('./users/users.service');
    const { JwtAuthGuard } = await import('./auth/jwt-auth.guard');

    authorFindMany.mockImplementation(async () =>
      [...authors].sort((a, b) => a.name.localeCompare(b.name)),
    );
    publisherFindMany.mockImplementation(async () =>
      [...publishers].sort((a, b) => a.name.localeCompare(b.name)),
    );
    genreFindMany.mockImplementation(async () =>
      [...genres].sort((a, b) => a.name.localeCompare(b.name)),
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        PrismaModule,
        AuthModule,
        AuthorsModule,
        PublishersModule,
        GenresModule,
      ],
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
        author: { findMany: authorFindMany },
        publisher: { findMany: publisherFindMany },
        genre: { findMany: genreFindMany },
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

  describe.each([
    {
      path: '/api/authors',
      findMany: () => authorFindMany,
      expected: [
        { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Allende' },
        { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Bolaño' },
      ],
    },
    {
      path: '/api/publishers',
      findMany: () => publisherFindMany,
      expected: [
        { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Alfaguara' },
        { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Planeta' },
      ],
    },
    {
      path: '/api/genres',
      findMany: () => genreFindMany,
      expected: [
        { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name: 'Ficción' },
        { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Historia' },
      ],
    },
  ])('$path', ({ path, findMany, expected }) => {
    it('GET con JWT → 200 y array { id, name } ordenado por name', async () => {
      const response = await request(app.getHttpServer() as App)
        .get(path)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(expected);
      expect(findMany()).toHaveBeenCalledWith({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    });

    it('GET sin token → 401', async () => {
      await request(app.getHttpServer() as App).get(path).expect(401);
    });

    it('POST/PATCH/DELETE no existen → 404', async () => {
      const server = app.getHttpServer() as App;
      const auth = { Authorization: `Bearer ${accessToken}` };

      await request(server).post(path).set(auth).send({ name: 'X' }).expect(404);
      await request(server)
        .patch(`${path}/some-id`)
        .set(auth)
        .send({ name: 'X' })
        .expect(404);
      await request(server).delete(`${path}/some-id`).set(auth).expect(404);
    });
  });
});
