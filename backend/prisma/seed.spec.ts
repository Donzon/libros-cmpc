import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { runSeed, SEED_BOOK_IDS, SEED_USER } from './seed';

const BACKEND_ROOT = path.resolve(__dirname, '..');

type UpsertArgs = {
  where: Record<string, unknown>;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
};

function createMockPrisma() {
  const users = new Map<string, { email: string; passwordHash: string }>();
  const authors = new Map<string, { id: string; name: string }>();
  const publishers = new Map<string, { id: string; name: string }>();
  const genres = new Map<string, { id: string; name: string }>();
  const books = new Map<
    string,
    {
      id: string;
      title: string;
      price: string;
      available: boolean;
      authorId: string;
      publisherId: string;
      genreId: string;
      deletedAt: Date | null;
    }
  >();

  let idSeq = 0;
  const nextId = () => {
    idSeq += 1;
    return `00000000-0000-4000-8000-${String(idSeq).padStart(12, '0')}`;
  };

  const upsertByUnique = <T extends { id: string }>(
    store: Map<string, T>,
    uniqueKey: string,
    getKey: (row: T) => string,
    args: UpsertArgs,
    build: (data: Record<string, unknown>, id: string) => T,
  ): T => {
    const existing = [...store.values()].find(
      (row) => getKey(row) === String(args.where[uniqueKey]),
    );
    if (existing) {
      Object.assign(existing, args.update);
      return existing;
    }
    const id =
      typeof args.create.id === 'string' ? args.create.id : nextId();
    const created = build(args.create, id);
    store.set(created.id, created);
    return created;
  };

  const prisma = {
    user: {
      upsert: jest.fn(async (args: UpsertArgs) => {
        const email = String(args.where.email);
        const existing = users.get(email);
        if (existing) {
          existing.passwordHash = String(args.update.passwordHash);
          return existing;
        }
        const created = {
          email: String(args.create.email),
          passwordHash: String(args.create.passwordHash),
        };
        users.set(email, created);
        return created;
      }),
      findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
        return users.get(where.email) ?? null;
      }),
    },
    author: {
      upsert: jest.fn(async (args: UpsertArgs) =>
        upsertByUnique(authors, 'name', (row) => row.name, args, (data, id) => ({
          id,
          name: String(data.name),
        })),
      ),
    },
    publisher: {
      upsert: jest.fn(async (args: UpsertArgs) =>
        upsertByUnique(
          publishers,
          'name',
          (row) => row.name,
          args,
          (data, id) => ({
            id,
            name: String(data.name),
          }),
        ),
      ),
    },
    genre: {
      upsert: jest.fn(async (args: UpsertArgs) =>
        upsertByUnique(genres, 'name', (row) => row.name, args, (data, id) => ({
          id,
          name: String(data.name),
        })),
      ),
    },
    book: {
      upsert: jest.fn(async (args: UpsertArgs) => {
        const id = String(args.where.id);
        const existing = books.get(id);
        if (existing) {
          Object.assign(existing, {
            title: String(args.update.title),
            price: String(args.update.price),
            available: Boolean(args.update.available),
            authorId: String(args.update.authorId),
            publisherId: String(args.update.publisherId),
            genreId: String(args.update.genreId),
            deletedAt: (args.update.deletedAt as Date | null) ?? null,
          });
          return existing;
        }
        const created = {
          id,
          title: String(args.create.title),
          price: String(args.create.price),
          available: Boolean(args.create.available),
          authorId: String(args.create.authorId),
          publisherId: String(args.create.publisherId),
          genreId: String(args.create.genreId),
          deletedAt: null,
        };
        books.set(id, created);
        return created;
      }),
      findMany: jest.fn(async () => [...books.values()]),
    },
    _stores: { users, authors, publishers, genres, books },
  };

  return prisma as unknown as PrismaClient & {
    _stores: {
      users: Map<string, { email: string; passwordHash: string }>;
      authors: Map<string, { id: string; name: string }>;
      publishers: Map<string, { id: string; name: string }>;
      genres: Map<string, { id: string; name: string }>;
      books: Map<
        string,
        {
          id: string;
          title: string;
          price: string;
          available: boolean;
          authorId: string;
          publisherId: string;
          genreId: string;
          deletedAt: Date | null;
        }
      >;
    };
  };
}

describe('Prisma seed (T4)', () => {
  it('crea usuario conocido, lookups y ≥1 libro con FKs válidas', async () => {
    const prisma = createMockPrisma();

    await runSeed(prisma);

    const user = prisma._stores.users.get(SEED_USER.email);
    expect(user).toBeDefined();
    expect(user?.email).toBe(SEED_USER.email);

    expect(prisma._stores.authors.size).toBeGreaterThanOrEqual(1);
    expect(prisma._stores.publishers.size).toBeGreaterThanOrEqual(1);
    expect(prisma._stores.genres.size).toBeGreaterThanOrEqual(1);
    expect(prisma._stores.books.size).toBeGreaterThanOrEqual(1);

    const book = prisma._stores.books.get(SEED_BOOK_IDS.cienAnos);
    expect(book).toBeDefined();
    expect(prisma._stores.authors.has(book!.authorId)).toBe(true);
    expect(prisma._stores.publishers.has(book!.publisherId)).toBe(true);
    expect(prisma._stores.genres.has(book!.genreId)).toBe(true);
  });

  it('guarda password con hash bcrypt (no texto plano)', async () => {
    const prisma = createMockPrisma();

    await runSeed(prisma);

    const user = prisma._stores.users.get(SEED_USER.email);
    expect(user).toBeDefined();
    expect(user!.passwordHash).not.toBe(SEED_USER.password);
    expect(user!.passwordHash.startsWith('$2')).toBe(true);
    await expect(
      bcrypt.compare(SEED_USER.password, user!.passwordHash),
    ).resolves.toBe(true);
  });

  it('es idempotente: re-ejecutar no duplica entidades', async () => {
    const prisma = createMockPrisma();

    await runSeed(prisma);
    const afterFirst = {
      users: prisma._stores.users.size,
      authors: prisma._stores.authors.size,
      publishers: prisma._stores.publishers.size,
      genres: prisma._stores.genres.size,
      books: prisma._stores.books.size,
    };

    await runSeed(prisma);

    expect(prisma._stores.users.size).toBe(afterFirst.users);
    expect(prisma._stores.authors.size).toBe(afterFirst.authors);
    expect(prisma._stores.publishers.size).toBe(afterFirst.publishers);
    expect(prisma._stores.genres.size).toBe(afterFirst.genres);
    expect(prisma._stores.books.size).toBe(afterFirst.books);

    expect(prisma.user.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.book.upsert).toHaveBeenCalledTimes(6);
  });

  it('configura migrate + seed en el arranque Docker', () => {
    const entrypoint = readFileSync(
      path.join(BACKEND_ROOT, 'docker-entrypoint.sh'),
      'utf8',
    );
    const pkg = JSON.parse(
      readFileSync(path.join(BACKEND_ROOT, 'package.json'), 'utf8'),
    ) as { prisma?: { seed?: string } };
    const dockerfile = readFileSync(
      path.join(BACKEND_ROOT, 'Dockerfile'),
      'utf8',
    );

    expect(entrypoint).toContain('prisma migrate deploy');
    expect(entrypoint).toContain('prisma db seed');
    expect(pkg.prisma?.seed).toMatch(/prisma\/seed\.ts/);
    expect(dockerfile).toContain('docker-entrypoint.sh');
  });
});
