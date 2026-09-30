import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';

/**
 * Serves UPLOAD_DIR at /uploads (read-only GET via express.static).
 * Outside the /api global prefix. Path traversal is blocked by `send`.
 */
export function configureStaticUploads(
  app: NestExpressApplication,
  uploadDir: string,
): void {
  const resolved = path.resolve(uploadDir);
  const booksDir = path.join(resolved, 'books');

  if (!existsSync(booksDir)) {
    mkdirSync(booksDir, { recursive: true });
  }

  app.useStaticAssets(resolved, {
    prefix: '/uploads/',
    index: false,
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
    },
  });
}
