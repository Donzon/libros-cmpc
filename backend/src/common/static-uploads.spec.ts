import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureStaticUploads } from './static-uploads';

describe('configureStaticUploads', () => {
  let app: NestExpressApplication;
  let uploadDir: string;

  beforeAll(async () => {
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmpc-static-'));
    await fs.mkdir(path.join(uploadDir, 'books'), { recursive: true });
    await fs.writeFile(
      path.join(uploadDir, 'books', 'cover.jpg'),
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureStaticUploads(app, uploadDir);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await fs.rm(uploadDir, { recursive: true, force: true });
  });

  it('sirve GET de archivos bajo /uploads', async () => {
    const res = await request(app.getHttpServer() as App)
      .get('/uploads/books/cover.jpg')
      .expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-disposition']).toMatch(/inline/);
  });

  it('no lista el directorio', async () => {
    await request(app.getHttpServer() as App)
      .get('/uploads/books/')
      .expect(404);
  });

  it('path traversal no escapa UPLOAD_DIR', async () => {
    const outside = path.join(uploadDir, '..', 'leak.txt');
    await fs.writeFile(outside, 'leaked');

    await request(app.getHttpServer() as App)
      .get('/uploads/../leak.txt')
      .expect((res) => {
        expect([403, 404]).toContain(res.status);
        expect(res.text).not.toContain('leaked');
      });

    await fs.rm(outside, { force: true });
  });
});
