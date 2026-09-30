import { describe, expect, it } from 'vitest';
import { bookFormSchema } from './book.schema';

const AUTHOR_ID = 'a1111111-1111-4111-8111-111111111111';
const PUBLISHER_ID = 'b1111111-1111-4111-8111-111111111111';
const GENRE_ID = 'c1111111-1111-4111-8111-111111111111';

describe('bookFormSchema (T16)', () => {
  it('acepta payload válido espejo del CreateBookDto', () => {
    const result = bookFormSchema.safeParse({
      title: 'El Quijote',
      price: '19.99',
      available: true,
      authorId: AUTHOR_ID,
      publisherId: PUBLISHER_ID,
      genreId: GENRE_ID,
    });

    expect(result.success).toBe(true);
  });

  it('rechaza título vacío y precio inválido', () => {
    const result = bookFormSchema.safeParse({
      title: '   ',
      price: '12.345',
      available: true,
      authorId: AUTHOR_ID,
      publisherId: PUBLISHER_ID,
      genreId: GENRE_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain('title');
      expect(paths).toContain('price');
    }
  });
});
