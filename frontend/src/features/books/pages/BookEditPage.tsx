import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HttpError } from '../../../shared/api/http-client';
import {
  ErrorState,
  LoadingState,
} from '../../../shared/ui/query-states';
import { BookForm } from '../components/BookForm';
import {
  useUpdateBookMutation,
  useUploadBookImageMutation,
} from '../hooks/useBookMutations';
import { useBookQuery } from '../hooks/useBookQuery';
import {
  useAuthorsQuery,
  useCreateAuthorMutation,
  useGenresQuery,
  usePublishersQuery,
} from '../hooks/useLookupsQueries';
import {
  EMPTY_BOOK_FORM_VALUES,
  toBookWritePayload,
  type BookFormValues,
} from '../schemas/book.schema';
import { resolveBookAuthorId } from '../utils/resolve-book-author';

function uploadErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    return err.message;
  }
  return 'No se pudo subir la imagen. Puedes reintentar solo la subida.';
}

export function BookEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateMutation = useUpdateBookMutation();
  const createAuthorMutation = useCreateAuthorMutation();
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
    if (!id || pendingUpload) {
      return;
    }
    setFormError(null);
    setUploadError(null);
    try {
      const authorId = await resolveBookAuthorId(values, (name) =>
        createAuthorMutation.mutateAsync(name),
      );
      await updateMutation.mutateAsync({
        id,
        payload: toBookWritePayload(values, authorId),
      });
      if (!selectedFile) {
        void navigate(`/books/${id}`);
        return;
      }
      try {
        await uploadMutation.mutateAsync({ id, file: selectedFile });
        void navigate(`/books/${id}`);
      } catch (err) {
        setPendingUpload({ bookId: id, file: selectedFile });
        setUploadError(uploadErrorMessage(err));
      }
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
        authorMode: 'existing',
        authorId: bookQuery.data.authorId,
        authorName: '',
        publisherId: bookQuery.data.publisherId,
        genreId: bookQuery.data.genreId,
      }
    : EMPTY_BOOK_FORM_VALUES;

  return (
    <main className="grid gap-6">
      <p className="flex flex-wrap items-center gap-2">
        <Button variant="link" asChild className="h-auto p-0">
          <Link to={`/books/${id ?? ''}`}>← Volver al detalle</Link>
        </Button>
        <span className="text-muted-foreground">·</span>
        <Button variant="link" asChild className="h-auto p-0">
          <Link to="/books">Listado</Link>
        </Button>
      </p>
      <h1 className="text-2xl font-semibold text-foreground">Editar libro</h1>

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
          selectedFile={selectedFile}
          onSelectedFileChange={setSelectedFile}
          imageValidationError={imageValidationError}
          onImageValidationErrorChange={setImageValidationError}
          existingImageUrl={bookQuery.data.imageUrl}
          uploadRetry={
            pendingUpload
              ? {
                  message:
                    uploadError ??
                    'Los datos se guardaron, pero falló la subida de la imagen.',
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
