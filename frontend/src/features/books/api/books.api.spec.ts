import { afterEach, describe, expect, it, vi } from 'vitest';
import * as httpModule from '../../../shared/api/http';
import { listBooks } from './books.api';

describe('listBooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /books con page y limit (T14)', async () => {
    const get = vi.spyOn(httpModule.http, 'get').mockResolvedValue({
      data: [],
      meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
    });

    const result = await listBooks({ page: 2, limit: 10 });

    expect(get).toHaveBeenCalledWith('/books?page=2&limit=10');
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it('sin params no agrega query string (T14)', async () => {
    const get = vi.spyOn(httpModule.http, 'get').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await listBooks();

    expect(get).toHaveBeenCalledWith('/books');
  });

  it('serializa filtros, sort y search combinables (T15)', async () => {
    const get = vi.spyOn(httpModule.http, 'get').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await listBooks({
      page: 1,
      limit: 20,
      search: 'casa',
      genreId: 'g1111111-1111-1111-1111-111111111111',
      publisherId: 'p1111111-1111-1111-1111-111111111111',
      authorId: 'a1111111-1111-1111-1111-111111111111',
      available: true,
      sortBy: 'price',
      sortOrder: 'desc',
    });

    const calledUrl = get.mock.calls[0]?.[0] as string;
    expect(calledUrl.startsWith('/books?')).toBe(true);

    const qs = new URLSearchParams(calledUrl.slice('/books?'.length));
    expect(qs.get('page')).toBe('1');
    expect(qs.get('limit')).toBe('20');
    expect(qs.get('search')).toBe('casa');
    expect(qs.get('genreId')).toBe('g1111111-1111-1111-1111-111111111111');
    expect(qs.get('publisherId')).toBe('p1111111-1111-1111-1111-111111111111');
    expect(qs.get('authorId')).toBe('a1111111-1111-1111-1111-111111111111');
    expect(qs.get('available')).toBe('true');
    expect(qs.get('sortBy')).toBe('price');
    expect(qs.get('sortOrder')).toBe('desc');
  });
});
