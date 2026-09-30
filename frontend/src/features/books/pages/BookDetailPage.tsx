import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { HttpError } from '../../../shared/api/http-client';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/ui/query-states';
import { resolveBookImageSrc } from '../api/books.api';
import { useDeleteBookMutation } from '../hooks/useBookMutations';
import { useBookQuery } from '../hooks/useBookQuery';

function formatAvailability(available: boolean): string {
  return available ? 'Disponible' : 'No disponible';
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bookQuery = useBookQuery(id);
  const deleteMutation = useDeleteBookMutation();

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

  const deleteErrorMessage =
    deleteMutation.isError
      ? deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : 'No se pudo eliminar el libro.'
      : null;

  const handleDelete = () => {
    if (!book) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar «${book.title}»? Dejará de aparecer en el inventario (borrado lógico).`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(book.id, {
      onSuccess: () => {
        void navigate('/books');
      },
    });
  };

  return (
    <main data-testid="book-detail-page" className="grid gap-6">
      <p>
        <Button variant="link" asChild className="h-auto p-0">
          <Link to="/books">← Volver al listado</Link>
        </Button>
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
        <Card>
          <article data-testid="book-detail">
            <CardHeader className="gap-4">
              <h1 className="text-2xl font-semibold text-foreground">
                {book.title}
              </h1>
              {imageSrc ? (
                <p>
                  <img
                    src={imageSrc}
                    alt={`Portada de ${book.title}`}
                    data-testid="book-detail-image"
                    className="max-h-72 rounded-lg border object-contain"
                  />
                </p>
              ) : (
                <p
                  data-testid="book-detail-no-image"
                  className="text-sm text-muted-foreground"
                >
                  Sin imagen
                </p>
              )}
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Precio</dt>
                  <dd data-testid="book-detail-price">{book.price}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Disponibilidad
                  </dt>
                  <dd data-testid="book-detail-available">
                    {formatAvailability(book.available)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Autor</dt>
                  <dd data-testid="book-detail-author">{book.author.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Editorial</dt>
                  <dd data-testid="book-detail-publisher">
                    {book.publisher.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Género</dt>
                  <dd data-testid="book-detail-genre">{book.genre.name}</dd>
                </div>
              </dl>
              {deleteErrorMessage ? (
                <div className="mt-6">
                  <ErrorState message={deleteErrorMessage} />
                </div>
              ) : null}
              <p className="mt-6 flex flex-wrap gap-2">
                <Button asChild>
                  <Link
                    to={`/books/${book.id}/edit`}
                    data-testid="book-detail-edit-link"
                  >
                    Editar
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="book-detail-delete"
                  disabled={deleteMutation.isPending}
                  onClick={handleDelete}
                >
                  {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
                </Button>
              </p>
            </CardContent>
          </article>
        </Card>
      ) : null}
    </main>
  );
}
