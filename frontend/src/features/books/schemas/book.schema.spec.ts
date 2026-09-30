import { describe, expect, it } from 'vitest';
import { bookFormSchema, toBookWritePayload } from './book.schema';

const AUTHOR_ID = 'a1111111-1111-4111-8111-111111111111';
const PUBLISHER_ID = 'b1111111-1111-4111-8111-111111111111';
const GENRE_ID = 'c1111111-1111-4111-8111-111111111111';

describe('bookFormSchema (T16)', () => {
  it('acepta payload válido con autor existente', () => {
    const result = bookFormSchema.safeParse({
      title: 'El Quijote',
      price: '19.99',
      available: true,
      authorMode: 'existing',
      authorId: AUTHOR_ID,
      authorName: '',
      publisherId: PUBLISHER_ID,
      genreId: GENRE_ID,
    });

    expect(result.success).toBe(true);
  });

  it('acepta autor nuevo con nombre y sin authorId', () => {
    const result = bookFormSchema.safeParse({
      title: 'Rayuela',
      price: '15.00',
      available: true,
      authorMode: 'new',
      authorId: '',
      authorName: 'Julio Cortázar',
      publisherId: PUBLISHER_ID,
      genreId: GENRE_ID,
    });

    expect(result.success).toBe(true);
  });

  it('rechaza título vacío, precio inválido y autor nuevo sin nombre', () => {
    const result = bookFormSchema.safeParse({
      title: '   ',
      price: '12.345',
      available: true,
      authorMode: 'new',
      authorId: '',
      authorName: '  ',
      publisherId: PUBLISHER_ID,
      genreId: GENRE_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain('title');
      expect(paths).toContain('price');
      expect(paths).toContain('authorName');
    }
  });

  it('toBookWritePayload deja solo los campos del CreateBookDto', () => {
    expect(
      toBookWritePayload(
        {
          title: 'Rayuela',
          price: '15.00',
          available: true,
          authorMode: 'new',
          authorId: '',
          authorName: 'Cortázar',
          publisherId: PUBLISHER_ID,
          genreId: GENRE_ID,
        },
        AUTHOR_ID,
      ),
    ).toEqual({
      title: 'Rayuela',
      price: '15.00',
      available: true,
      authorId: AUTHOR_ID,
      publisherId: PUBLISHER_ID,
      genreId: GENRE_ID,
    });
  });
});
