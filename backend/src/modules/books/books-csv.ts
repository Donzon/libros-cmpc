import { Prisma } from '@prisma/client';
import { BookWithRelations } from './mappers/book.mapper';

export const CSV_HEADERS = [
  'titulo',
  'autor',
  'editorial',
  'genero',
  'precio',
  'disponibilidad',
] as const;

function formatPrice(price: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(price).toFixed(2);
}

export function escapeCsvField(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toBooksCsv(books: BookWithRelations[]): string {
  const header = CSV_HEADERS.join(',');
  const rows = books.map((book) =>
    [
      escapeCsvField(book.title),
      escapeCsvField(book.author.name),
      escapeCsvField(book.publisher.name),
      escapeCsvField(book.genre.name),
      escapeCsvField(formatPrice(book.price)),
      escapeCsvField(book.available ? 'true' : 'false'),
    ].join(','),
  );

  return [header, ...rows].join('\n');
}
