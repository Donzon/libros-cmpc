import { describe, expect, it, vi } from 'vitest';
import { resolveBookAuthorId } from './resolve-book-author';
import type { BookFormValues } from '../schemas/book.schema';

const AUTHOR_ID = 'a1111111-1111-4111-8111-111111111111';
const NEW_AUTHOR_ID = 'e1111111-1111-4111-8111-111111111111';
const PUBLISHER_ID = 'b1111111-1111-4111-8111-111111111111';
const GENRE_ID = 'c1111111-1111-4111-8111-111111111111';

const baseValues: BookFormValues = {
  title: 'Rayuela',
  price: '15.00',
  available: true,
  authorMode: 'existing',
  authorId: AUTHOR_ID,
  authorName: '',
  publisherId: PUBLISHER_ID,
  genreId: GENRE_ID,
};

describe('resolveBookAuthorId', () => {
  it('devuelve el authorId si el modo es existente', async () => {
    const createAuthor = vi.fn();

    await expect(
      resolveBookAuthorId(baseValues, createAuthor),
    ).resolves.toBe(AUTHOR_ID);

    expect(createAuthor).not.toHaveBeenCalled();
  });

  it('crea el autor y devuelve su id si el modo es nuevo', async () => {
    const createAuthor = vi.fn().mockResolvedValue({
      id: NEW_AUTHOR_ID,
      name: 'Cortázar',
    });

    await expect(
      resolveBookAuthorId(
        { ...baseValues, authorMode: 'new', authorName: '  Cortázar  ' },
        createAuthor,
      ),
    ).resolves.toBe(NEW_AUTHOR_ID);

    expect(createAuthor).toHaveBeenCalledWith('Cortázar');
  });
});
