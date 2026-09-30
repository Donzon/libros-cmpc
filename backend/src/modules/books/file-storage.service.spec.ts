import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileStorageService } from './file-storage.service';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmpc-uploads-'));

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'UPLOAD_DIR') {
                return tempDir;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(FileStorageService);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('buildRelativePath usa books/<bookId>-<timestamp>.<ext>', () => {
    const bookId = 'd4444444-4444-4444-8444-444444444444';
    expect(service.buildRelativePath(bookId, 'webp', 1710000000000)).toBe(
      `books/${bookId}-1710000000000.webp`,
    );
  });

  it('write persiste el archivo bajo UPLOAD_DIR', async () => {
    const relative = 'books/test-1.jpg';
    const buffer = Buffer.from([0xff, 0xd8, 0xff]);

    await service.write(relative, buffer);

    const absolute = path.join(tempDir, relative);
    const stored = await fs.readFile(absolute);
    expect(stored.equals(buffer)).toBe(true);
  });

  it('deleteIfExists elimina un archivo existente', async () => {
    const relative = 'books/old.jpg';
    await service.write(relative, Buffer.from('x'));
    await service.deleteIfExists(relative);

    await expect(fs.access(path.join(tempDir, relative))).rejects.toMatchObject(
      { code: 'ENOENT' },
    );
  });

  it('deleteIfExists no falla si el archivo no existe', async () => {
    await expect(
      service.deleteIfExists('books/missing.jpg'),
    ).resolves.toBeUndefined();
  });

  it('absolutePath rechaza path traversal', () => {
    expect(() => service.absolutePath('../etc/passwd')).toThrow(
      BadRequestException,
    );
    expect(() => service.absolutePath('../../secret')).toThrow(
      BadRequestException,
    );
  });

  it('absolutePath resuelve rutas válidas dentro de UPLOAD_DIR', () => {
    const resolved = service.absolutePath('books/ok.jpg');
    expect(resolved).toBe(path.join(tempDir, 'books', 'ok.jpg'));
    expect(resolved.startsWith(tempDir)).toBe(true);
  });
});
