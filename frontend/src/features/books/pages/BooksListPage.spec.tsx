import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AppQueryProvider } from '../../../shared/providers/query-client';
import type { BooksListResponse } from '../api/books.api';
import { BooksListPage } from './BooksListPage';

vi.mock('../api/books.api', () => ({
  listBooks: vi.fn(),
}));

import { listBooks } from '../api/books.api';

const listBooksMock = vi.mocked(listBooks);

function createBook(overrides: Partial<BooksListResponse['data'][number]> = {}) {
  return {
    id: overrides.id ?? '11111111-1111-1111-1111-111111111111',
    title: overrides.title ?? 'El Quijote',
    price: overrides.price ?? '19.99',
    available: overrides.available ?? true,
    imagePath: overrides.imagePath ?? null,
    imageUrl: overrides.imageUrl ?? null,
    authorId: overrides.authorId ?? 'a1111111-1111-1111-1111-111111111111',
    publisherId:
      overrides.publisherId ?? 'p1111111-1111-1111-1111-111111111111',
    genreId: overrides.genreId ?? 'g1111111-1111-1111-1111-111111111111',
    author: overrides.author ?? {
      id: 'a1111111-1111-1111-1111-111111111111',
      name: 'Cervantes',
    },
    publisher: overrides.publisher ?? {
      id: 'p1111111-1111-1111-1111-111111111111',
      name: 'Planeta',
    },
    genre: overrides.genre ?? {
      id: 'g1111111-1111-1111-1111-111111111111',
      name: 'Clásico',
    },
  };
}

function createListResponse(
  overrides: Partial<BooksListResponse> = {},
): BooksListResponse {
  return {
    data: overrides.data ?? [createBook()],
    meta: overrides.meta ?? {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  };
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

function renderBooksListPage() {
  return render(
    <AppQueryProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <BooksListPage />
      </MemoryRouter>
    </AppQueryProvider>,
  );
}

describe('BooksListPage (T14)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('muestra estado loading mientras carga', () => {
    listBooksMock.mockImplementation(
      () => new Promise<BooksListResponse>(() => undefined),
    );

    renderBooksListPage();

    expect(screen.getByTestId('loading-state')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Libros' })).toBeTruthy();
  });

  it('muestra filas cuando hay datos', async () => {
    listBooksMock.mockResolvedValue(
      createListResponse({
        data: [
          createBook({ title: 'Cien años de soledad', price: '25.50' }),
          createBook({
            id: '22222222-2222-2222-2222-222222222222',
            title: 'Rayuela',
            price: '18.00',
            author: {
              id: 'a2222222-2222-2222-2222-222222222222',
              name: 'Cortázar',
            },
          }),
        ],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      }),
    );

    renderBooksListPage();

    await waitFor(() => {
      expect(screen.getByText('Cien años de soledad')).toBeTruthy();
      expect(screen.getByText('Rayuela')).toBeTruthy();
    });

    expect(screen.getByTestId('books-total').textContent).toContain('Total: 2');
    expect(listBooksMock).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('muestra estado vacío cuando no hay libros', async () => {
    listBooksMock.mockResolvedValue(
      createListResponse({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    );

    renderBooksListPage();

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });

    expect(screen.queryByRole('table')).toBeNull();
  });

  it('muestra estado de error cuando falla la carga', async () => {
    listBooksMock.mockRejectedValue(new Error('Fallo de red'));

    renderBooksListPage();

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeTruthy();
    });

    expect(screen.getByRole('alert').textContent).toContain('Fallo de red');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('cambio de página dispara fetch con page nuevo y muestra meta.total', async () => {
    listBooksMock.mockImplementation(async (params) => {
      const page = params?.page ?? 1;

      if (page === 1) {
        return createListResponse({
          data: [createBook({ title: 'Libro página 1' })],
          meta: { page: 1, limit: 20, total: 42, totalPages: 3 },
        });
      }

      return createListResponse({
        data: [
          createBook({
            id: '33333333-3333-3333-3333-333333333333',
            title: 'Libro página 2',
          }),
        ],
        meta: { page: 2, limit: 20, total: 42, totalPages: 3 },
      });
    });

    renderBooksListPage();

    await waitFor(() => {
      expect(screen.getByText('Libro página 1')).toBeTruthy();
    });

    expect(screen.getByTestId('books-total').textContent).toContain('Total: 42');
    expect(listBooksMock).toHaveBeenCalledWith({ page: 1, limit: 20 });

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => {
      expect(listBooksMock).toHaveBeenCalledWith({ page: 2, limit: 20 });
      expect(screen.getByText('Libro página 2')).toBeTruthy();
    });

    expect(screen.getByTestId('books-total').textContent).toContain('Total: 42');
    expect(screen.getByTestId('books-page-info').textContent).toBe(
      'Página 2 de 3',
    );
  });
});
