import { Link, useParams } from 'react-router-dom';
import { HttpError } from '../../../shared/api/http-client';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/ui/query-states';
import { resolveBookImageSrc } from '../api/books.api';
import { useBookQuery } from '../hooks/useBookQuery';

function formatAvailability(available: boolean): string {
  return available ? 'Disponible' : 'No disponible';
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookQuery = useBookQuery(id);

  const showLoading = bookQuery.isLoading && !bookQuery.data;
  const isNotFound =
    bookQuery.isError &&
    bookQuery.error instanceof HttpError &&
    bookQuery.error.status === 404;

  const errorMessage =
    bookQuery.isError && !bookQuery.data && !isNotFound
      ? bookQuery.error instanceof Error
        ? bookQuery.error.message
        : 'No se pudo cargar el libro.'
      : null;

  const book = bookQuery.data;
  const imageSrc = book ? resolveBookImageSrc(book.imageUrl) : null;

  return (
    <main data-testid="book-detail-page">
      <p>
        <Link to="/books">← Volver al listado</Link>
      </p>

      {showLoading ? <LoadingState message="Cargando libro…" /> : null}

      {isNotFound ? (
        <EmptyState message="Libro no encontrado." />
      ) : null}

      {errorMessage ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => {
            void bookQuery.refetch();
          }}
        />
      ) : null}

      {book ? (
        <article data-testid="book-detail">
          <h1>{book.title}</h1>
          {imageSrc ? (
            <p>
              <img
                src={imageSrc}
                alt={`Portada de ${book.title}`}
                data-testid="book-detail-image"
              />
            </p>
          ) : (
            <p data-testid="book-detail-no-image">Sin imagen</p>
          )}
          <dl>
            <div>
              <dt>Precio</dt>
              <dd data-testid="book-detail-price">{book.price}</dd>
            </div>
            <div>
              <dt>Disponibilidad</dt>
              <dd data-testid="book-detail-available">
                {formatAvailability(book.available)}
              </dd>
            </div>
            <div>
              <dt>Autor</dt>
              <dd data-testid="book-detail-author">{book.author.name}</dd>
            </div>
            <div>
              <dt>Editorial</dt>
              <dd data-testid="book-detail-publisher">
                {book.publisher.name}
              </dd>
            </div>
            <div>
              <dt>Género</dt>
              <dd data-testid="book-detail-genre">{book.genre.name}</dd>
            </div>
          </dl>
          <p>
            <Link
              to={`/books/${book.id}/edit`}
              data-testid="book-detail-edit-link"
            >
              Editar
            </Link>
          </p>
        </article>
      ) : null}
    </main>
  );
}
