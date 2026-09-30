import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_DEBOUNCE_MS,
  useDebouncedValue,
} from '../../../shared/hooks/useDebouncedValue';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/ui/query-states';
import {
  BooksListControls,
  type BooksListFiltersState,
} from '../components/BooksListControls';
import type { ListBooksParams } from '../api/books.api';
import {
  DEFAULT_BOOKS_LIMIT,
  useBooksQuery,
} from '../hooks/useBooksQuery';
import {
  useAuthorsQuery,
  useGenresQuery,
  usePublishersQuery,
} from '../hooks/useLookupsQueries';

function formatAvailability(available: boolean): string {
  return available ? 'Disponible' : 'No disponible';
}

function toAvailableParam(
  value: BooksListFiltersState['available'],
): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function buildListParams(
  page: number,
  filters: BooksListFiltersState,
  debouncedSearch: string,
): ListBooksParams {
  const search = debouncedSearch.trim();

  return {
    page,
    limit: DEFAULT_BOOKS_LIMIT,
    search: search.length > 0 ? search : undefined,
    genreId: filters.genreId || undefined,
    publisherId: filters.publisherId || undefined,
    authorId: filters.authorId || undefined,
    available: toAvailableParam(filters.available),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };
}

const INITIAL_FILTERS: BooksListFiltersState = {
  searchInput: '',
  genreId: '',
  publisherId: '',
  authorId: '',
  available: '',
  sortBy: 'title',
  sortOrder: 'asc',
};

export function BooksListPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<BooksListFiltersState>(INITIAL_FILTERS);
  const debouncedSearch = useDebouncedValue(
    filters.searchInput,
    DEFAULT_DEBOUNCE_MS,
  );

  const authorsQuery = useAuthorsQuery();
  const publishersQuery = usePublishersQuery();
  const genresQuery = useGenresQuery();

  // Search debounced: al estabilizarse el término, volver a la página 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const patchFilters = (
    patch: Partial<BooksListFiltersState>,
    options: { resetPage?: boolean } = {},
  ) => {
    const { resetPage = true } = options;
    setFilters((current) => ({ ...current, ...patch }));
    if (resetPage) {
      setPage(1);
    }
  };

  const listParams = buildListParams(page, filters, debouncedSearch);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useBooksQuery(listParams);

  const showInitialLoading = isLoading && !data;

  return (
    <main>
      <h1>Libros</h1>
      <p>
        <Link to="/books/new" data-testid="books-new-link">
          Nuevo libro
        </Link>
      </p>

      <BooksListControls
        filters={filters}
        authors={authorsQuery.data ?? []}
        publishers={publishersQuery.data ?? []}
        genres={genresQuery.data ?? []}
        onSearchChange={(searchInput) =>
          patchFilters({ searchInput }, { resetPage: false })
        }
        onGenreChange={(genreId) => patchFilters({ genreId })}
        onPublisherChange={(publisherId) => patchFilters({ publisherId })}
        onAuthorChange={(authorId) => patchFilters({ authorId })}
        onAvailableChange={(available) => patchFilters({ available })}
        onSortByChange={(sortBy) => patchFilters({ sortBy })}
        onSortOrderChange={(sortOrder) => patchFilters({ sortOrder })}
      />

      {showInitialLoading ? <LoadingState message="Cargando libros…" /> : null}

      {isError ? (
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los libros.'
          }
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}

      {!showInitialLoading && !isError && data && data.data.length === 0 ? (
        <EmptyState />
      ) : null}

      {!showInitialLoading && !isError && data && data.data.length > 0 ? (
        <>
          <p data-testid="books-total">
            Total: {data.meta.total}
            {isFetching ? ' (actualizando…)' : null}
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Autor</th>
                <th scope="col">Editorial</th>
                <th scope="col">Género</th>
                <th scope="col">Precio</th>
                <th scope="col">Disponibilidad</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((book) => (
                <tr key={book.id}>
                  <td>{book.title}</td>
                  <td>{book.author.name}</td>
                  <td>{book.publisher.name}</td>
                  <td>{book.genre.name}</td>
                  <td>{book.price}</td>
                  <td>{formatAvailability(book.available)}</td>
                  <td>
                    <Link
                      to={`/books/${book.id}/edit`}
                      data-testid={`books-edit-${book.id}`}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <nav aria-label="Paginación" data-testid="books-pagination">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <span data-testid="books-page-info">
              Página {data.meta.page} de {data.meta.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.meta.totalPages || isFetching}
              onClick={() =>
                setPage((current) =>
                  Math.min(data.meta.totalPages, current + 1),
                )
              }
            >
              Siguiente
            </button>
          </nav>
        </>
      ) : null}
    </main>
  );
}
