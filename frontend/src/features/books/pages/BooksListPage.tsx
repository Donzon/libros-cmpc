import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useExportBooksCsvMutation } from '../hooks/useBookMutations';
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
  const exportCsvMutation = useExportBooksCsvMutation();

  const showInitialLoading = isLoading && !data;

  const exportErrorMessage =
    exportCsvMutation.isError
      ? exportCsvMutation.error instanceof Error
        ? exportCsvMutation.error.message
        : 'No se pudo exportar el CSV.'
      : null;

  return (
    <main className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Libros</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="books-export-csv"
            disabled={exportCsvMutation.isPending}
            onClick={() => {
              exportCsvMutation.mutate(listParams);
            }}
          >
            {exportCsvMutation.isPending ? 'Exportando…' : 'Exportar CSV'}
          </Button>
          <Button asChild>
            <Link to="/books/new" data-testid="books-new-link">
              Nuevo libro
            </Link>
          </Button>
        </div>
      </div>

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

      {exportErrorMessage ? (
        <ErrorState
          message={exportErrorMessage}
          onRetry={() => {
            exportCsvMutation.mutate(listParams);
          }}
        />
      ) : null}

      {!showInitialLoading && !isError && data && data.data.length === 0 ? (
        <EmptyState />
      ) : null}

      {!showInitialLoading && !isError && data && data.data.length > 0 ? (
        <>
          <p data-testid="books-total" className="text-sm text-muted-foreground">
            Total: {data.meta.total}
            {isFetching ? ' (actualizando…)' : null}
          </p>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Título</TableHead>
                  <TableHead scope="col">Autor</TableHead>
                  <TableHead scope="col">Editorial</TableHead>
                  <TableHead scope="col">Género</TableHead>
                  <TableHead scope="col">Precio</TableHead>
                  <TableHead scope="col">Disponibilidad</TableHead>
                  <TableHead scope="col">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell>
                      <Link
                        to={`/books/${book.id}`}
                        data-testid={`books-detail-${book.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {book.title}
                      </Link>
                    </TableCell>
                    <TableCell>{book.author.name}</TableCell>
                    <TableCell>{book.publisher.name}</TableCell>
                    <TableCell>{book.genre.name}</TableCell>
                    <TableCell>{book.price}</TableCell>
                    <TableCell>{formatAvailability(book.available)}</TableCell>
                    <TableCell>
                      <Button variant="link" asChild className="h-auto p-0">
                        <Link
                          to={`/books/${book.id}/edit`}
                          data-testid={`books-edit-${book.id}`}
                        >
                          Editar
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <nav
            aria-label="Paginación"
            data-testid="books-pagination"
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
          >
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <span data-testid="books-page-info" className="text-sm text-muted-foreground">
              Página {data.meta.page} de {data.meta.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={page >= data.meta.totalPages || isFetching}
              onClick={() =>
                setPage((current) =>
                  Math.min(data.meta.totalPages, current + 1),
                )
              }
            >
              Siguiente
            </Button>
          </nav>
        </>
      ) : null}
    </main>
  );
}
