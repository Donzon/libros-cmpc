import { Test } from '@nestjs/testing';
import { PrismaService } from './modules/prisma/prisma.service';

describe('AppModule', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.DATABASE_URL =
      'postgresql://cmpc:cmpc@localhost:5432/cmpc_libros';
    process.env.JWT_SECRET =
      'change-me-use-a-random-string-at-least-32-chars';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.PORT = '3000';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.UPLOAD_DIR = './uploads';
    process.env.MAX_IMAGE_BYTES = '2097152';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('compila el módulo raíz con config, prisma y health', async () => {
    const { AppModule } = await import('./app.module');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
