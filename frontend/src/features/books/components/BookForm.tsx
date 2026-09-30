import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { LookupItem } from '../api/lookups.api';
import {
  bookFormSchema,
  EMPTY_BOOK_FORM_VALUES,
  type BookFormValues,
} from '../schemas/book.schema';

export type BookFormProps = {
  defaultValues?: BookFormValues;
  authors: LookupItem[];
  publishers: LookupItem[];
  genres: LookupItem[];
  submitLabel: string;
  onSubmit: (values: BookFormValues) => Promise<void>;
  formError?: string | null;
  lookupsLoading?: boolean;
  lookupsError?: string | null;
};

export function BookForm({
  defaultValues = EMPTY_BOOK_FORM_VALUES,
  authors,
  publishers,
  genres,
  submitLabel,
  onSubmit,
  formError = null,
  lookupsLoading = false,
  lookupsError = null,
}: BookFormProps) {
  const [hasValidated, setHasValidated] = useState(false);
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    void trigger().finally(() => {
      setHasValidated(true);
    });
  }, [trigger]);

  const hasFieldErrors = Object.keys(errors).length > 0;
  const fieldsDisabled =
    isSubmitting || lookupsLoading || Boolean(lookupsError);
  const submitDisabled =
    fieldsDisabled || !hasValidated || hasFieldErrors;

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      noValidate
      data-testid="book-form"
    >
      <div>
        <label htmlFor="title">Título</label>
        <input
          id="title"
          type="text"
          disabled={fieldsDisabled}
          aria-invalid={errors.title ? true : undefined}
          {...register('title')}
        />
        {errors.title ? (
          <p role="alert" data-testid="error-title">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="price">Precio</label>
        <input
          id="price"
          type="text"
          inputMode="decimal"
          disabled={fieldsDisabled}
          aria-invalid={errors.price ? true : undefined}
          {...register('price')}
        />
        {errors.price ? (
          <p role="alert" data-testid="error-price">
            {errors.price.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="available">
          <input
            id="available"
            type="checkbox"
            disabled={fieldsDisabled}
            {...register('available')}
          />{' '}
          Disponible
        </label>
      </div>

      <div>
        <label htmlFor="authorId">Autor</label>
        <select
          id="authorId"
          disabled={fieldsDisabled}
          aria-invalid={errors.authorId ? true : undefined}
          {...register('authorId')}
        >
          <option value="">Selecciona un autor</option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.name}
            </option>
          ))}
        </select>
        {errors.authorId ? (
          <p role="alert" data-testid="error-authorId">
            {errors.authorId.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="publisherId">Editorial</label>
        <select
          id="publisherId"
          disabled={fieldsDisabled}
          aria-invalid={errors.publisherId ? true : undefined}
          {...register('publisherId')}
        >
          <option value="">Selecciona una editorial</option>
          {publishers.map((publisher) => (
            <option key={publisher.id} value={publisher.id}>
              {publisher.name}
            </option>
          ))}
        </select>
        {errors.publisherId ? (
          <p role="alert" data-testid="error-publisherId">
            {errors.publisherId.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="genreId">Género</label>
        <select
          id="genreId"
          disabled={fieldsDisabled}
          aria-invalid={errors.genreId ? true : undefined}
          {...register('genreId')}
        >
          <option value="">Selecciona un género</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
        {errors.genreId ? (
          <p role="alert" data-testid="error-genreId">
            {errors.genreId.message}
          </p>
        ) : null}
      </div>

      {lookupsError ? (
        <p role="alert" data-testid="book-form-lookups-error">
          {lookupsError}
        </p>
      ) : null}

      {formError ? (
        <p role="alert" data-testid="book-form-error">
          {formError}
        </p>
      ) : null}

      <button type="submit" disabled={submitDisabled}>
        {isSubmitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}
