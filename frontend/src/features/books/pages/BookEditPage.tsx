import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HttpError } from '../../../shared/api/http-client';
import {
  ErrorState,
  LoadingState,
} from '../../../shared/ui/query-states';
import { BookForm } from '../components/BookForm';
import { useUpdateBookMutation } from '../hooks/useBookMutations';
import { useBookQuery } from '../hooks/useBookQuery';
import {
  useAuthorsQuery,
  useGenresQuery,
  usePublishersQuery,
} from '../hooks/useLookupsQueries';
import {
  EMPTY_BOOK_FORM_VALUES,
  type BookFormValues,
} from '../schemas/book.schema';

export function BookEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateMutation = useUpdateBookMutation();
  const [formError, setFormError] = useState<string | null>(null);

  const bookQuery = useBookQuery(id);
  const authorsQuery = useAuthorsQuery();
  const publishersQuery = usePublishersQuery();
  const genresQuery = useGenresQuery();

  const lookupsLoading =
    authorsQuery.isLoading ||
    publishersQuery.isLoading ||
    genresQuery.isLoading;

  const lookupsError =
    authorsQuery.isError || publishersQuery.isError || genresQuery.isError
      ? 'No se pudieron cargar autores, editoriales o géneros.'
      : null;

  async function handleSubmit(values: BookFormValues) {
    if (!id) {
      return;
    }
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ id, payload: values });
      void navigate('/books');
    } catch (err) {
      if (err instanceof HttpError) {
        setFormError(err.message);
      } else {
        setFormError('No se pudo actualizar el libro. Intenta de nuevo.');
      }
    }
  }

  const showBookLoading = bookQuery.isLoading && !bookQuery.data;
  const bookError =
    bookQuery.isError && !bookQuery.data
      ? bookQuery.error instanceof Error
        ? bookQuery.error.message
        : 'No se pudo cargar el libro.'
      : null;

  const defaultValues: BookFormValues = bookQuery.data
    ? {
        title: bookQuery.data.title,
        price: bookQuery.data.price,
        available: bookQuery.data.available,
        authorId: bookQuery.data.authorId,
        publisherId: bookQuery.data.publisherId,
        genreId: bookQuery.data.genreId,
      }
    : EMPTY_BOOK_FORM_VALUES;

  return (
    <main>
      <p>
        <Link to="/books">← Volver al listado</Link>
      </p>
      <h1>Editar libro</h1>

      {showBookLoading || (lookupsLoading && !authorsQuery.data) ? (
        <LoadingState message="Cargando libro…" />
      ) : null}

      {bookError ? <ErrorState message={bookError} /> : null}

      {lookupsError && !lookupsLoading && !bookError ? (
        <ErrorState message={lookupsError} />
      ) : null}

      {bookQuery.data &&
      authorsQuery.data &&
      publishersQuery.data &&
      genresQuery.data &&
      !lookupsError ? (
        <BookForm
          key={bookQuery.data.id}
          defaultValues={defaultValues}
          authors={authorsQuery.data}
          publishers={publishersQuery.data}
          genres={genresQuery.data}
          submitLabel="Guardar cambios"
          onSubmit={handleSubmit}
          formError={formError}
        />
      ) : null}
    </main>
  );
}
