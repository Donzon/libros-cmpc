import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HttpError } from '../../../shared/api/http-client';
import {
  ErrorState,
  LoadingState,
} from '../../../shared/ui/query-states';
import { BookForm } from '../components/BookForm';
import {
  useCreateBookMutation,
  useUploadBookImageMutation,
} from '../hooks/useBookMutations';
import {
  useAuthorsQuery,
  useGenresQuery,
  usePublishersQuery,
} from '../hooks/useLookupsQueries';
import type { BookFormValues } from '../schemas/book.schema';

function uploadErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    return err.message;
  }
  return 'No se pudo subir la imagen. Puedes reintentar solo la subida.';
}

export function BookCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateBookMutation();
  const uploadMutation = useUploadBookImageMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageValidationError, setImageValidationError] = useState<
    string | null
  >(null);
  const [pendingUpload, setPendingUpload] = useState<{
    bookId: string;
    file: File;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  async function handleRetryUpload() {
    if (!pendingUpload) {
      return;
    }
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync({
        id: pendingUpload.bookId,
        file: pendingUpload.file,
      });
      setPendingUpload(null);
      void navigate(`/books/${pendingUpload.bookId}`);
    } catch (err) {
      setUploadError(uploadErrorMessage(err));
    }
  }

  async function handleSubmit(values: BookFormValues) {
    if (pendingUpload) {
      return;
    }
    setFormError(null);
    setUploadError(null);
    try {
      const book = await createMutation.mutateAsync(values);
      if (!selectedFile) {
        void navigate(`/books/${book.id}`);
        return;
      }
      try {
        await uploadMutation.mutateAsync({
          id: book.id,
          file: selectedFile,
        });
        void navigate(`/books/${book.id}`);
      } catch (err) {
        setPendingUpload({ bookId: book.id, file: selectedFile });
        setUploadError(uploadErrorMessage(err));
      }
    } catch (err) {
      if (err instanceof HttpError) {
        setFormError(err.message);
      } else {
        setFormError('No se pudo crear el libro. Intenta de nuevo.');
      }
    }
  }

  return (
    <main className="grid gap-6">
      <p>
        <Button variant="link" asChild className="h-auto p-0">
          <Link to="/books">← Volver al listado</Link>
        </Button>
      </p>
      <h1 className="text-2xl font-semibold text-foreground">Nuevo libro</h1>

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
          selectedFile={selectedFile}
          onSelectedFileChange={setSelectedFile}
          imageValidationError={imageValidationError}
          onImageValidationErrorChange={setImageValidationError}
          uploadRetry={
            pendingUpload
              ? {
                  message:
                    uploadError ??
                    'El libro se creó, pero falló la subida de la imagen.',
                  onRetry: handleRetryUpload,
                  isRetrying: uploadMutation.isPending,
                }
              : null
          }
        />
      ) : null}
    </main>
  );
}
