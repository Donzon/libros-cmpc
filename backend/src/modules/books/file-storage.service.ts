import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EnvConfig } from '../config/env.schema';

@Injectable()
export class FileStorageService {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  get uploadDir(): string {
    return path.resolve(this.config.get('UPLOAD_DIR', { infer: true }));
  }

  buildRelativePath(
    bookId: string,
    extension: string,
    timestamp: number = Date.now(),
  ): string {
    return `books/${bookId}-${timestamp}.${extension}`;
  }

  /**
   * Resolves a relative path under UPLOAD_DIR; rejects path traversal.
   */
  absolutePath(relativePath: string): string {
    const root = this.uploadDir;
    const resolved = path.resolve(root, relativePath);
    const relative = path.relative(root, resolved);

    if (
      relative.startsWith('..') ||
      path.isAbsolute(relative) ||
      relative === ''
    ) {
      throw new BadRequestException('Invalid upload path');
    }

    return resolved;
  }

  async ensureBooksDir(): Promise<void> {
    await fs.mkdir(path.join(this.uploadDir, 'books'), { recursive: true });
  }

  async write(relativePath: string, buffer: Buffer): Promise<void> {
    const absolute = this.absolutePath(relativePath);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer);
  }

  async deleteIfExists(relativePath: string | null): Promise<void> {
    if (relativePath === null || relativePath === '') {
      return;
    }

    try {
      await fs.unlink(this.absolutePath(relativePath));
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
