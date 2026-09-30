import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HttpError } from '../../../shared/api/http-client';
import {
  ErrorState,
  LoadingState,
} from '../../../shared/ui/query-states';
import { BookForm } from '../components/BookForm';
import { useCreateBookMutation } from '../hooks/useBookMutations';
import {
  useAuthorsQuery,
  useGenresQuery,
  usePublishersQuery,
} from '../hooks/useLookupsQueries';
import type { BookFormValues } from '../schemas/book.schema';

export function BookCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateBookMutation();
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
      void navigate('/books');
    } catch (err) {
      if (err instanceof HttpError) {
        setFormError(err.message);
      } else {
        setFormError('No se pudo crear el libro. Intenta de nuevo.');
      }
    }
  }

  return (
    <main>
      <p>
        <Link to="/books">← Volver al listado</Link>
      </p>
      <h1>Nuevo libro</h1>

      {lookupsLoading && !authorsQuery.data ? (
        <LoadingState message="Cargando catálogos…" />
      ) : null}

      {lookupsError && !lookupsLoading ? (
        <ErrorState message={lookupsError} />
      ) : null}

      {authorsQuery.data &&
      publishersQuery.data &&
      genresQuery.data &&
      !lookupsError ? (
        <BookForm
          authors={authorsQuery.data}
          publishers={publishersQuery.data}
          genres={genresQuery.data}
          submitLabel="Crear libro"
          onSubmit={handleSubmit}
          formError={formError}
        />
      ) : null}
    </main>
  );
}
