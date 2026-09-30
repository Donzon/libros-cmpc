import {
  buildBooksOrderBy,
  buildBooksWhere,
} from './books-query.builder';

describe('books-query.builder', () => {
  describe('buildBooksWhere', () => {
    it('siempre incluye deletedAt: null', () => {
      expect(buildBooksWhere({})).toEqual({ deletedAt: null });
    });

    it('combina genreId, publisherId, authorId y available', () => {
      const genreId = 'c3333333-3333-4333-8333-333333333333';
      const publisherId = 'b2222222-2222-4222-8222-222222222222';
      const authorId = 'a1111111-1111-4111-8111-111111111111';

      expect(
        buildBooksWhere({
          genreId,
          publisherId,
          authorId,
          available: true,
        }),
      ).toEqual({
        deletedAt: null,
        genreId,
        publisherId,
        authorId,
        available: true,
      });
    });

    it('search filtra solo por title case-insensitive', () => {
      const where = buildBooksWhere({ search: 'Espíritus' });

      expect(where).toEqual({
        deletedAt: null,
        title: { contains: 'Espíritus', mode: 'insensitive' },
      });
      expect(where).not.toHaveProperty('author');
      expect(where).not.toHaveProperty('authorId');
    });

    it('search vacío o solo espacios no agrega filtro de title', () => {
      expect(buildBooksWhere({ search: '   ' })).toEqual({ deletedAt: null });
      expect(buildBooksWhere({ search: '' })).toEqual({ deletedAt: null });
    });

    it('search no filtra por autor aunque el término parezca un nombre', () => {
      const where = buildBooksWhere({ search: 'Allende' });

      expect(where.title).toEqual({
        contains: 'Allende',
        mode: 'insensitive',
      });
      expect(where.authorId).toBeUndefined();
      expect(where).not.toHaveProperty('author');
    });
  });

  describe('buildBooksOrderBy', () => {
    it('ordena por title asc por defecto', () => {
      expect(buildBooksOrderBy({})).toEqual({ title: 'asc' });
    });

    it('ordena por title desc', () => {
      expect(buildBooksOrderBy({ sortBy: 'title', sortOrder: 'desc' })).toEqual(
        { title: 'desc' },
      );
    });

    it('ordena por price', () => {
      expect(buildBooksOrderBy({ sortBy: 'price', sortOrder: 'asc' })).toEqual({
        price: 'asc',
      });
    });

    it('ordena por createdAt', () => {
      expect(
        buildBooksOrderBy({ sortBy: 'createdAt', sortOrder: 'desc' }),
      ).toEqual({ createdAt: 'desc' });
    });

    it('ordena por author.name', () => {
      expect(
        buildBooksOrderBy({ sortBy: 'author', sortOrder: 'asc' }),
      ).toEqual({ author: { name: 'asc' } });
      expect(
        buildBooksOrderBy({ sortBy: 'author', sortOrder: 'desc' }),
      ).toEqual({ author: { name: 'desc' } });
    });
  });
});
