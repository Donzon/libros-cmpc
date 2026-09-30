import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SCHEMA_PATH = path.join(BACKEND_ROOT, 'prisma', 'schema.prisma');
const MIGRATIONS_DIR = path.join(BACKEND_ROOT, 'prisma', 'migrations');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf8');
}

function listMigrationSqlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listMigrationSqlFiles(fullPath);
    }
    return entry.name === 'migration.sql' ? [fullPath] : [];
  });
}

describe('Prisma schema (T3)', () => {
  const schema = readSchema();

  it('pasa prisma validate', () => {
    const output = execFileSync(
      'npx',
      ['prisma', 'validate', '--schema', SCHEMA_PATH],
      {
        cwd: BACKEND_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          DATABASE_URL:
            process.env.DATABASE_URL ??
            'postgresql://cmpc:cmpc@localhost:5432/cmpc_libros',
        },
      },
    );

    expect(output).toMatch(/The schema at .* is valid/i);
  });

  it('declara modelos y enum requeridos', () => {
    expect(schema).toMatch(/enum\s+AuditAction\s*\{/);
    for (const model of [
      'User',
      'Author',
      'Publisher',
      'Genre',
      'Book',
      'AuditLog',
    ]) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\s*\\{`));
    }
  });

  it('define price Decimal(10,2), available Boolean y deletedAt opcional', () => {
    expect(schema).toMatch(/price\s+Decimal\s+@db\.Decimal\(10,\s*2\)/);
    expect(schema).toMatch(/available\s+Boolean/);
    expect(schema).toMatch(/deletedAt\s+DateTime\?/);
  });

  it('declara relaciones 1:N Book → Author, Publisher, Genre', () => {
    expect(schema).toMatch(
      /author\s+Author\s+@relation\(fields:\s*\[authorId\]/,
    );
    expect(schema).toMatch(
      /publisher\s+Publisher\s+@relation\(fields:\s*\[publisherId\]/,
    );
    expect(schema).toMatch(
      /genre\s+Genre\s+@relation\(fields:\s*\[genreId\]/,
    );
  });

  it('incluye los índices de design.md §4', () => {
    const requiredIndexes = [
      '@@index([deletedAt])',
      '@@index([genreId])',
      '@@index([publisherId])',
      '@@index([authorId])',
      '@@index([available])',
      '@@index([title])',
      '@@index([price])',
      '@@index([deletedAt, genreId, publisherId, authorId])',
      '@@index([createdAt])',
      '@@index([entity, entityId])',
      '@@index([userId])',
    ];

    for (const index of requiredIndexes) {
      expect(schema).toContain(index);
    }

    expect(schema).toMatch(/email\s+String\s+@unique/);
    expect(schema).toMatch(/name\s+String\s+@unique/);
  });

  it('tiene migración inicial versionada', () => {
    const migrationSql = listMigrationSqlFiles(MIGRATIONS_DIR);

    expect(migrationSql.length).toBeGreaterThanOrEqual(1);

    const sql = readFileSync(migrationSql[0], 'utf8');
    expect(sql).toMatch(/CREATE TABLE "User"/);
    expect(sql).toMatch(/CREATE TABLE "Book"/);
    expect(sql).toMatch(/CREATE TABLE "AuditLog"/);
    expect(sql).toMatch(/CREATE TYPE "AuditAction"/);
    expect(sql).toMatch(/CREATE INDEX.*"Book_deletedAt_idx"/);
    expect(sql).toMatch(
      /CREATE INDEX.*"Book_deletedAt_genreId_publisherId_authorId_idx"/,
    );
  });
});
