import {
  Controller,
  Get,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { User } from '@prisma/client';

@Controller('auth-probe')
class AuthProbeController {
  @Get()
  probe(): { ok: true } {
    return { ok: true };
  }
}

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

describe('Auth HTTP (login, guard, throttler)', () => {
  const originalEnv = { ...process.env };
  const password = 'Admin123!';
  let user: User;

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
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function createAuthTestApp(): Promise<INestApplication> {
    applyTestEnv();

    const { AppConfigModule } = await import('../config/config.module');
    const { AuthModule } = await import('./auth.module');
    const { UsersService } = await import('../users/users.service');
    const { JwtAuthGuard } = await import('./jwt-auth.guard');

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule, AuthModule],
      controllers: [AuthProbeController],
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
      .compile();

    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    return app;
  }

  describe('login y guard JWT', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createAuthTestApp();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('POST /api/auth/login público → accessToken y expiresIn', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/api/auth/login')
        .send({ email: user.email, password })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        expiresIn: '30m',
      });
      expect(response.body.accessToken.length).toBeGreaterThan(10);
    });

    it('ruta protegida sin token → 401', async () => {
      await request(app.getHttpServer() as App)
        .get('/api/auth-probe')
        .expect(401);
    });

    it('ruta protegida con token → 200', async () => {
      const login = await request(app.getHttpServer() as App)
        .post('/api/auth/login')
        .send({ email: user.email, password })
        .expect(200);

      await request(app.getHttpServer() as App)
        .get('/api/auth-probe')
        .set('Authorization', `Bearer ${login.body.accessToken as string}`)
        .expect(200)
        .expect({ ok: true });
    });
  });

  describe('throttler en login', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createAuthTestApp();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('exceso de intentos en POST /api/auth/login → 429', async () => {
      const server = app.getHttpServer() as App;

      for (let i = 0; i < 5; i += 1) {
        await request(server)
          .post('/api/auth/login')
          .send({ email: user.email, password: 'wrong' });
      }

      await request(server)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'wrong' })
        .expect(429);
    });
  });
});
