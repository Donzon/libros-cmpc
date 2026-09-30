import { useState } from 'react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/ui/query-states';
import {
  DEFAULT_BOOKS_LIMIT,
  useBooksQuery,
} from '../hooks/useBooksQuery';

function formatAvailability(available: boolean): string {
  return available ? 'Disponible' : 'No disponible';
}

export function BooksListPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useBooksQuery({ page, limit: DEFAULT_BOOKS_LIMIT });

  const showInitialLoading = isLoading && !data;

  return (
    <main>
      <h1>Libros</h1>

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
