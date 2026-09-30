import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/** Usuario de prueba del seed (REQ-DB5). Credenciales documentadas para login. */
export const SEED_USER = {
  email: 'admin@cmpc.local',
  password: 'Admin123!',
} as const;

const BCRYPT_ROUNDS = 10;

const AUTHORS = [
  { name: 'Gabriel García Márquez' },
  { name: 'Isabel Allende' },
  { name: 'Mario Vargas Llosa' },
] as const;

const PUBLISHERS = [
  { name: 'Editorial Sudamericana' },
  { name: 'Plaza & Janés' },
  { name: 'Alfaguara' },
] as const;

const GENRES = [
  { name: 'Realismo mágico' },
  { name: 'Novela histórica' },
  { name: 'Ficción contemporánea' },
] as const;

/** UUIDs fijos para que el seed de libros sea idempotente (upsert por id). */
export const SEED_BOOK_IDS = {
  cienAnos: 'a1000000-0000-4000-8000-000000000001',
  casaEspiritus: 'a1000000-0000-4000-8000-000000000002',
  fiestaChivo: 'a1000000-0000-4000-8000-000000000003',
} as const;

export async function runSeed(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_USER.password, BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email: SEED_USER.email },
    update: { passwordHash },
    create: {
      email: SEED_USER.email,
      passwordHash,
    },
  });

  const authors = await Promise.all(
    AUTHORS.map((author) =>
      prisma.author.upsert({
        where: { name: author.name },
        update: {},
        create: { name: author.name },
      }),
    ),
  );

  const publishers = await Promise.all(
    PUBLISHERS.map((publisher) =>
      prisma.publisher.upsert({
        where: { name: publisher.name },
        update: {},
        create: { name: publisher.name },
      }),
    ),
  );

  const genres = await Promise.all(
    GENRES.map((genre) =>
      prisma.genre.upsert({
        where: { name: genre.name },
        update: {},
        create: { name: genre.name },
      }),
    ),
  );

  const books = [
    {
      id: SEED_BOOK_IDS.cienAnos,
      title: 'Cien años de soledad',
      price: '19.99',
      available: true,
      authorId: authors[0].id,
      publisherId: publishers[0].id,
      genreId: genres[0].id,
    },
    {
      id: SEED_BOOK_IDS.casaEspiritus,
      title: 'La casa de los espíritus',
      price: '18.50',
      available: true,
      authorId: authors[1].id,
      publisherId: publishers[1].id,
      genreId: genres[0].id,
    },
    {
      id: SEED_BOOK_IDS.fiestaChivo,
      title: 'La fiesta del chivo',
      price: '21.00',
      available: false,
      authorId: authors[2].id,
      publisherId: publishers[2].id,
      genreId: genres[1].id,
    },
  ] as const;

  for (const book of books) {
    await prisma.book.upsert({
      where: { id: book.id },
      update: {
        title: book.title,
        price: book.price,
        available: book.available,
        authorId: book.authorId,
        publisherId: book.publisherId,
        genreId: book.genreId,
        deletedAt: null,
      },
      create: {
        id: book.id,
        title: book.title,
        price: book.price,
        available: book.available,
        authorId: book.authorId,
        publisherId: book.publisherId,
        genreId: book.genreId,
      },
    });
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await runSeed(prisma);
    console.log(
      `Seed OK: usuario ${SEED_USER.email} y libros de ejemplo listos.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
