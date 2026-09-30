import { Prisma } from '@prisma/client';
import { escapeCsvField, toBooksCsv, CSV_HEADERS } from './books-csv';
import { BookWithRelations } from './mappers/book.mapper';

function buildBook(
  overrides: Partial<BookWithRelations> & {
    title?: string;
    author?: { id: string; name: string };
    publisher?: { id: string; name: string };
    genre?: { id: string; name: string };
    price?: Prisma.Decimal;
    available?: boolean;
  } = {},
): BookWithRelations {
  return {
    id: 'd4444444-4444-4444-8444-444444444444',
    title: 'La casa de los espíritus',
    price: new Prisma.Decimal('19.99'),
    available: true,
    imagePath: null,
    authorId: 'a1111111-1111-4111-8111-111111111111',
    publisherId: 'b2222222-2222-4222-8222-222222222222',
    genreId: 'c3333333-3333-4333-8333-333333333333',
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    author: { id: 'a1111111-1111-4111-8111-111111111111', name: 'Allende' },
    publisher: {
      id: 'b2222222-2222-4222-8222-222222222222',
      name: 'Planeta',
    },
    genre: { id: 'c3333333-3333-4333-8333-333333333333', name: 'Ficción' },
    ...overrides,
  };
}

describe('books-csv', () => {
  describe('escapeCsvField', () => {
    it('no escapa valores simples', () => {
      expect(escapeCsvField('hola')).toBe('hola');
      expect(escapeCsvField('19.99')).toBe('19.99');
      expect(escapeCsvField('true')).toBe('true');
    });

    it('escapa comas envolviendo en comillas', () => {
      expect(escapeCsvField('a,b')).toBe('"a,b"');
    });

    it('escapa comillas duplicándolas', () => {
      expect(escapeCsvField('dice "hola"')).toBe('"dice ""hola"""');
    });

    it('escapa saltos de línea', () => {
      expect(escapeCsvField('linea1\nlinea2')).toBe('"linea1\nlinea2"');
      expect(escapeCsvField('linea1\rlinea2')).toBe('"linea1\rlinea2"');
    });
  });

  describe('toBooksCsv', () => {
    it('genera header y fila sin escape cuando no hace falta', () => {
      const csv = toBooksCsv([buildBook()]);

      expect(csv).toBe(
        [
          CSV_HEADERS.join(','),
          'La casa de los espíritus,Allende,Planeta,Ficción,19.99,true',
        ].join('\n'),
      );
    });

    it('escapa comillas, comas y saltos en campos', () => {
      const csv = toBooksCsv([
        buildBook({
          title: 'Titulo, con "comillas"\ny salto',
          author: { id: 'a', name: 'Autor, Jr.' },
          available: false,
          price: new Prisma.Decimal('10.5'),
        }),
      ]);

      expect(csv.startsWith(`${CSV_HEADERS.join(',')}\n`)).toBe(true);
      expect(csv).toContain('"Titulo, con ""comillas""\ny salto"');
      expect(csv).toContain('"Autor, Jr."');
      expect(csv).toContain('10.50');
      expect(csv).toContain('false');
    });

    it('soporta múltiples filas', () => {
      const csv = toBooksCsv([
        buildBook({ title: 'Uno' }),
        buildBook({ title: 'Dos', available: false }),
      ]);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('Uno');
      expect(lines[2]).toContain('Dos');
      expect(lines[2]).toContain('false');
    });

    it('solo header cuando no hay libros', () => {
      expect(toBooksCsv([])).toBe(CSV_HEADERS.join(','));
    });
  });
});
