import { afterEach, describe, expect, it, vi } from 'vitest';
import * as httpModule from '../../../shared/api/http';
import * as httpClient from '../../../shared/api/http-client';
import {
  createBook,
  deleteBook,
  exportBooksCsv,
  getBook,
  listBooks,
  resolveBookImageSrc,
  toExportBooksParams,
  updateBook,
  uploadBookImage,
} from './books.api';

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

describe('books mutations (T16)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getBook GET /books/:id', async () => {
    const book = { id: 'd1111111-1111-4111-8111-111111111111', title: 'X' };
    const get = vi.spyOn(httpModule.http, 'get').mockResolvedValue(book);

    const result = await getBook(book.id);

    expect(get).toHaveBeenCalledWith(`/books/${book.id}`);
    expect(result).toEqual(book);
  });

  it('createBook POST /books', async () => {
    const payload = {
      title: 'Nuevo',
      price: '10.00',
      available: true,
      authorId: 'a1111111-1111-4111-8111-111111111111',
      publisherId: 'b1111111-1111-4111-8111-111111111111',
      genreId: 'c1111111-1111-4111-8111-111111111111',
    };
    const post = vi
      .spyOn(httpModule.http, 'post')
      .mockResolvedValue({ id: '1', ...payload });

    await createBook(payload);

    expect(post).toHaveBeenCalledWith('/books', payload);
  });

  it('updateBook PATCH /books/:id', async () => {
    const id = 'd1111111-1111-4111-8111-111111111111';
    const payload = { title: 'Editado' };
    const patch = vi
      .spyOn(httpModule.http, 'patch')
      .mockResolvedValue({ id, title: 'Editado' });

    await updateBook(id, payload);

    expect(patch).toHaveBeenCalledWith(`/books/${id}`, payload);
  });

  it('uploadBookImage POST /books/:id/image con FormData file (T17)', async () => {
    const id = 'd1111111-1111-4111-8111-111111111111';
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'cover.jpg', {
      type: 'image/jpeg',
    });
    const post = vi
      .spyOn(httpModule.http, 'post')
      .mockResolvedValue({ id, imageUrl: '/uploads/books/x.jpg' });

    await uploadBookImage(id, file);

    expect(post).toHaveBeenCalledTimes(1);
    const [path, body] = post.mock.calls[0] as [string, FormData];
    expect(path).toBe(`/books/${id}/image`);
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
  });

  it('deleteBook DELETE /books/:id', async () => {
    const id = 'd1111111-1111-4111-8111-111111111111';
    const del = vi.spyOn(httpModule.http, 'delete').mockResolvedValue(undefined);

    await deleteBook(id);

    expect(del).toHaveBeenCalledWith(`/books/${id}`);
  });
});

describe('exportBooksCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('omito page/limit y serializa filtros; devuelve Blob CSV', async () => {
    const get = vi
      .spyOn(httpModule.http, 'get')
      .mockResolvedValue('titulo,autor\nEl Quijote,Cervantes');

    const blob = await exportBooksCsv({
      page: 2,
      limit: 20,
      search: 'casa',
      genreId: 'g1111111-1111-1111-1111-111111111111',
      available: true,
      sortBy: 'price',
      sortOrder: 'desc',
    });

    const calledUrl = get.mock.calls[0]?.[0] as string;
    expect(calledUrl.startsWith('/books/export/csv?')).toBe(true);

    const qs = new URLSearchParams(calledUrl.slice('/books/export/csv?'.length));
    expect(qs.get('page')).toBeNull();
    expect(qs.get('limit')).toBeNull();
    expect(qs.get('search')).toBe('casa');
    expect(qs.get('genreId')).toBe('g1111111-1111-1111-1111-111111111111');
    expect(qs.get('available')).toBe('true');
    expect(qs.get('sortBy')).toBe('price');
    expect(qs.get('sortOrder')).toBe('desc');

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/csv');
  });

  it('toExportBooksParams descarta paginación', () => {
    expect(
      toExportBooksParams({
        page: 3,
        limit: 10,
        search: 'q',
        sortBy: 'title',
        sortOrder: 'asc',
      }),
    ).toEqual({
      search: 'q',
      genreId: undefined,
      publisherId: undefined,
      authorId: undefined,
      available: undefined,
      sortBy: 'title',
      sortOrder: 'asc',
    });
  });
});

describe('resolveBookImageSrc (T17)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve null si no hay imageUrl', () => {
    expect(resolveBookImageSrc(null)).toBeNull();
    expect(resolveBookImageSrc(undefined)).toBeNull();
    expect(resolveBookImageSrc('')).toBeNull();
  });

  it('resuelve /uploads relativo al origen del API (sin /api)', () => {
    vi.spyOn(httpClient, 'getApiBaseUrl').mockReturnValue(
      'http://localhost:3000/api',
    );

    expect(resolveBookImageSrc('/uploads/books/x.webp')).toBe(
      'http://localhost:3000/uploads/books/x.webp',
    );
  });

  it('deja URLs absolutas intactas', () => {
    expect(resolveBookImageSrc('https://cdn.example/x.jpg')).toBe(
      'https://cdn.example/x.jpg',
    );
  });
});
