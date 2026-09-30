import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppQueryProvider } from '../../../shared/providers/query-client';
import { HttpError } from '../../../shared/api/http-client';
import { BookDetailPage } from './BookDetailPage';

vi.mock('../api/books.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/books.api')>();
  return {
    ...actual,
    getBook: vi.fn(),
    deleteBook: vi.fn(),
  };
});

import { deleteBook, getBook, type BookResponse } from '../api/books.api';

const getBookMock = vi.mocked(getBook);
const deleteBookMock = vi.mocked(deleteBook);

const AUTHOR_ID = 'a1111111-1111-4111-8111-111111111111';
const PUBLISHER_ID = 'b1111111-1111-4111-8111-111111111111';
const GENRE_ID = 'c1111111-1111-4111-8111-111111111111';
const BOOK_ID = 'd1111111-1111-4111-8111-111111111111';

function createBookResponse(
  overrides: Partial<BookResponse> = {},
): BookResponse {
  return {
    id: overrides.id ?? BOOK_ID,
    title: overrides.title ?? 'El Quijote',
    price: overrides.price ?? '19.99',
    available: overrides.available ?? true,
    imagePath: overrides.imagePath ?? null,
    imageUrl: overrides.imageUrl ?? null,
    authorId: overrides.authorId ?? AUTHOR_ID,
    publisherId: overrides.publisherId ?? PUBLISHER_ID,
    genreId: overrides.genreId ?? GENRE_ID,
    author: overrides.author ?? { id: AUTHOR_ID, name: 'Cervantes' },
    publisher: overrides.publisher ?? {
      id: PUBLISHER_ID,
      name: 'Planeta',
    },
    genre: overrides.genre ?? { id: GENRE_ID, name: 'Clásico' },
  };
}

function renderDetail(path = `/books/${BOOK_ID}`) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <AppQueryProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/books" element={<p data-testid="books-list">Listado</p>} />
          <Route path="/books/:id" element={<BookDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AppQueryProvider>,
  );
}

describe('BookDetailPage (T17)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000/api');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('renderiza todos los campos e imagen cuando hay imageUrl', async () => {
    getBookMock.mockResolvedValue(
      createBookResponse({
        imageUrl: '/uploads/books/cover.webp',
      }),
    );

    renderDetail();

    await screen.findByTestId('book-detail');
    expect(screen.getByRole('heading', { name: 'El Quijote' })).toBeTruthy();
    expect(screen.getByTestId('book-detail-price').textContent).toBe('19.99');
    expect(screen.getByTestId('book-detail-available').textContent).toBe(
      'Disponible',
    );
    expect(screen.getByTestId('book-detail-author').textContent).toBe(
      'Cervantes',
    );
    expect(screen.getByTestId('book-detail-publisher').textContent).toBe(
      'Planeta',
    );
    expect(screen.getByTestId('book-detail-genre').textContent).toBe(
      'Clásico',
    );

    const img = screen.getByTestId('book-detail-image') as HTMLImageElement;
    expect(img.src).toBe('http://localhost:3000/uploads/books/cover.webp');
    expect(
      (screen.getByTestId('book-detail-edit-link') as HTMLAnchorElement).getAttribute(
        'href',
      ),
    ).toBe(`/books/${BOOK_ID}/edit`);
  });

  it('muestra loading mientras carga', async () => {
    let resolveBook!: (value: BookResponse) => void;
    getBookMock.mockReturnValue(
      new Promise<BookResponse>((resolve) => {
        resolveBook = resolve;
      }),
    );

    renderDetail();
    expect(screen.getByTestId('loading-state')).toBeTruthy();

    resolveBook(createBookResponse());
    await screen.findByTestId('book-detail');
  });

  it('muestra empty cuando el libro no existe (404)', async () => {
    getBookMock.mockRejectedValue(new HttpError(404, 'Not found'));

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('empty-state').textContent).toMatch(
        /no encontrado/i,
      );
    });
  });

  it('si se cancela la confirmación no llama a delete', async () => {
    getBookMock.mockResolvedValue(createBookResponse());
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderDetail();
    await screen.findByTestId('book-detail');

    fireEvent.click(screen.getByTestId('book-detail-delete'));

    expect(deleteBookMock).not.toHaveBeenCalled();
  });

  it('al confirmar elimina, invalida y navega al listado', async () => {
    getBookMock.mockResolvedValue(createBookResponse());
    deleteBookMock.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderDetail();
    await screen.findByTestId('book-detail');

    fireEvent.click(screen.getByTestId('book-detail-delete'));

    await waitFor(() => {
      expect(deleteBookMock).toHaveBeenCalledWith(BOOK_ID);
      expect(screen.getByTestId('books-list')).toBeTruthy();
    });
  });

  it('muestra error si el delete falla y permanece en el detalle', async () => {
    getBookMock.mockResolvedValue(createBookResponse());
    deleteBookMock.mockRejectedValue(new Error('No se pudo borrar'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderDetail();
    await screen.findByTestId('book-detail');

    fireEvent.click(screen.getByTestId('book-detail-delete'));

    await waitFor(() => {
      expect(screen.getByTestId('error-state').textContent).toContain(
        'No se pudo borrar',
      );
    });

    expect(screen.getByTestId('book-detail')).toBeTruthy();
    expect(screen.queryByTestId('books-list')).toBeNull();
  });
});
