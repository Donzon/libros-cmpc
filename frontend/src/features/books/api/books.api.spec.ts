import { afterEach, describe, expect, it, vi } from 'vitest';
import * as httpModule from '../../../shared/api/http';
import { listBooks } from './books.api';

describe('listBooks (T14)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /books con page y limit', async () => {
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

  it('sin params no agrega query string', async () => {
    const get = vi.spyOn(httpModule.http, 'get').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await listBooks();

    expect(get).toHaveBeenCalledWith('/books');
  });
});
