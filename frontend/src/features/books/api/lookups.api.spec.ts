import { afterEach, describe, expect, it, vi } from 'vitest';
import * as httpModule from '../../../shared/api/http';
import { listAuthors, createAuthor, listGenres, listPublishers } from './lookups.api';

describe('lookups.api (T15)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listAuthors GET /authors', async () => {
    const get = vi
      .spyOn(httpModule.http, 'get')
      .mockResolvedValue([{ id: 'a1', name: 'Allende' }]);

    await expect(listAuthors()).resolves.toEqual([
      { id: 'a1', name: 'Allende' },
    ]);
    expect(get).toHaveBeenCalledWith('/authors');
  });

  it('createAuthor POST /authors', async () => {
    const post = vi
      .spyOn(httpModule.http, 'post')
      .mockResolvedValue({ id: 'a2', name: 'Cortázar' });

    await expect(createAuthor('Cortázar')).resolves.toEqual({
      id: 'a2',
      name: 'Cortázar',
    });
    expect(post).toHaveBeenCalledWith('/authors', { name: 'Cortázar' });
  });

  it('listPublishers GET /publishers', async () => {
    const get = vi
      .spyOn(httpModule.http, 'get')
      .mockResolvedValue([{ id: 'p1', name: 'Planeta' }]);

    await expect(listPublishers()).resolves.toEqual([
      { id: 'p1', name: 'Planeta' },
    ]);
    expect(get).toHaveBeenCalledWith('/publishers');
  });

  it('listGenres GET /genres', async () => {
    const get = vi
      .spyOn(httpModule.http, 'get')
      .mockResolvedValue([{ id: 'g1', name: 'Novela' }]);

    await expect(listGenres()).resolves.toEqual([
      { id: 'g1', name: 'Novela' },
    ]);
    expect(get).toHaveBeenCalledWith('/genres');
  });
});
