import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AppQueryProvider } from '../../../shared/providers/query-client';
import { DEFAULT_DEBOUNCE_MS } from '../../../shared/hooks/useDebouncedValue';
import type { BooksListResponse } from '../api/books.api';
import { BooksListPage } from './BooksListPage';

vi.mock('../api/books.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/books.api')>();
  return {
    ...actual,
    listBooks: vi.fn(),
  };
});

vi.mock('../api/lookups.api', () => ({
  listAuthors: vi.fn(),
  listPublishers: vi.fn(),
  listGenres: vi.fn(),
}));

import { listBooks } from '../api/books.api';
import {
  listAuthors,
  listGenres,
  listPublishers,
} from '../api/lookups.api';

const listBooksMock = vi.mocked(listBooks);
const listAuthorsMock = vi.mocked(listAuthors);
const listPublishersMock = vi.mocked(listPublishers);
const listGenresMock = vi.mocked(listGenres);

const AUTHOR_ID = 'a1111111-1111-1111-1111-111111111111';
const PUBLISHER_ID = 'p1111111-1111-1111-1111-111111111111';
const GENRE_ID = 'g1111111-1111-1111-1111-111111111111';

function createBook(overrides: Partial<BooksListResponse['data'][number]> = {}) {
  return {
    id: overrides.id ?? '11111111-1111-1111-1111-111111111111',
    title: overrides.title ?? 'El Quijote',
    price: overrides.price ?? '19.99',
    available: overrides.available ?? true,
    imagePath: overrides.imagePath ?? null,
    imageUrl: overrides.imageUrl ?? null,
    authorId: overrides.authorId ?? AUTHOR_ID,
    publisherId: overrides.publisherId ?? PUBLISHER_ID,
    genreId: overrides.genreId ?? GENRE_ID,
    author: overrides.author ?? {
      id: AUTHOR_ID,
      name: 'Cervantes',
    },
    publisher: overrides.publisher ?? {
      id: PUBLISHER_ID,
      name: 'Planeta',
    },
    genre: overrides.genre ?? {
      id: GENRE_ID,
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

function mockLookups() {
  listAuthorsMock.mockResolvedValue([{ id: AUTHOR_ID, name: 'Cervantes' }]);
  listPublishersMock.mockResolvedValue([
    { id: PUBLISHER_ID, name: 'Planeta' },
  ]);
  listGenresMock.mockResolvedValue([{ id: GENRE_ID, name: 'Clásico' }]);
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

function defaultListParams(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    page: 1,
    limit: 20,
    search: undefined,
    genreId: undefined,
    publisherId: undefined,
    authorId: undefined,
    available: undefined,
    sortBy: 'title',
    sortOrder: 'asc',
    ...overrides,
  };
}

describe('BooksListPage (T14)', () => {
  beforeEach(() => {
    mockLookups();
  });

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
    expect(listBooksMock).toHaveBeenCalledWith(defaultListParams());
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
    expect(listBooksMock).toHaveBeenCalledWith(defaultListParams());

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => {
      expect(listBooksMock).toHaveBeenCalledWith(
        defaultListParams({ page: 2 }),
      );
      expect(screen.getByText('Libro página 2')).toBeTruthy();
    });

    expect(screen.getByTestId('books-total').textContent).toContain('Total: 42');
    expect(screen.getByTestId('books-page-info').textContent).toBe(
      'Página 2 de 3',
    );
  });
});

describe('BooksListPage filtros, orden y debounce (T15)', () => {
  beforeEach(() => {
    mockLookups();
    listBooksMock.mockResolvedValue(
      createListResponse({
        data: [createBook({ title: 'Casa de los espíritus' })],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('N teclas rápidas → una sola petición de search tras ~300 ms', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderBooksListPage();

    await waitFor(() => {
      expect(listBooksMock).toHaveBeenCalled();
    });

    listBooksMock.mockClear();

    const searchInput = screen.getByTestId('books-search');
    fireEvent.change(searchInput, { target: { value: 'c' } });
    fireEvent.change(searchInput, { target: { value: 'ca' } });
    fireEvent.change(searchInput, { target: { value: 'cas' } });
    fireEvent.change(searchInput, { target: { value: 'casa' } });

    expect(listBooksMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS - 1);
    });
    expect(listBooksMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(listBooksMock).toHaveBeenCalledTimes(1);
      expect(listBooksMock).toHaveBeenCalledWith(
        defaultListParams({ search: 'casa' }),
      );
    });
  });

  it('combinar filtros actualiza params de la query', async () => {
    renderBooksListPage();

    await waitFor(() => {
      expect(screen.getByTestId('books-filters')).toBeTruthy();
      expect(listBooksMock).toHaveBeenCalledWith(defaultListParams());
      expect(screen.getByRole('option', { name: 'Clásico' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Planeta' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Cervantes' })).toBeTruthy();
    });

    listBooksMock.mockClear();

    fireEvent.change(screen.getByTestId('books-filter-genre'), {
      target: { value: GENRE_ID },
    });
    fireEvent.change(screen.getByTestId('books-filter-publisher'), {
      target: { value: PUBLISHER_ID },
    });
    fireEvent.change(screen.getByTestId('books-filter-author'), {
      target: { value: AUTHOR_ID },
    });
    fireEvent.change(screen.getByTestId('books-filter-available'), {
      target: { value: 'true' },
    });

    await waitFor(() => {
      expect(listBooksMock).toHaveBeenCalledWith(
        defaultListParams({
          genreId: GENRE_ID,
          publisherId: PUBLISHER_ID,
          authorId: AUTHOR_ID,
          available: true,
        }),
      );
    });
  });

  it('cambio de sortBy/sortOrder dispara refetch', async () => {
    renderBooksListPage();

    await waitFor(() => {
      expect(listBooksMock).toHaveBeenCalledWith(defaultListParams());
    });

    listBooksMock.mockClear();

    fireEvent.change(screen.getByTestId('books-sort-by'), {
      target: { value: 'price' },
    });

    await waitFor(() => {
      expect(listBooksMock).toHaveBeenCalledWith(
        defaultListParams({ sortBy: 'price', sortOrder: 'asc' }),
      );
    });

    listBooksMock.mockClear();

    fireEvent.change(screen.getByTestId('books-sort-order'), {
      target: { value: 'desc' },
    });

    await waitFor(() => {
      expect(listBooksMock).toHaveBeenCalledWith(
        defaultListParams({ sortBy: 'price', sortOrder: 'desc' }),
      );
    });
  });
});
