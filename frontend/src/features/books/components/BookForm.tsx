import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { LookupItem } from '../api/lookups.api';
import {
  bookFormSchema,
  EMPTY_BOOK_FORM_VALUES,
  type BookFormValues,
} from '../schemas/book.schema';
import {
  BookImageField,
  type BookImageUploadRetry,
} from './BookImageField';

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
  selectedFile?: File | null;
  onSelectedFileChange?: (file: File | null) => void;
  imageValidationError?: string | null;
  onImageValidationErrorChange?: (error: string | null) => void;
  existingImageUrl?: string | null;
  uploadRetry?: BookImageUploadRetry | null;
  submitDisabledExtra?: boolean;
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
  selectedFile = null,
  onSelectedFileChange,
  imageValidationError = null,
  onImageValidationErrorChange,
  existingImageUrl = null,
  uploadRetry = null,
  submitDisabledExtra = false,
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
    fieldsDisabled ||
    !hasValidated ||
    hasFieldErrors ||
    Boolean(imageValidationError) ||
    Boolean(uploadRetry) ||
    submitDisabledExtra;

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      noValidate
      data-testid="book-form"
      className="grid max-w-xl gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          type="text"
          disabled={fieldsDisabled}
          aria-invalid={errors.title ? true : undefined}
          {...register('title')}
        />
        {errors.title ? (
          <p role="alert" data-testid="error-title" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="price">Precio</Label>
        <Input
          id="price"
          type="text"
          inputMode="decimal"
          disabled={fieldsDisabled}
          aria-invalid={errors.price ? true : undefined}
          {...register('price')}
        />
        {errors.price ? (
          <p role="alert" data-testid="error-price" className="text-sm text-destructive">
            {errors.price.message}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="available"
          type="checkbox"
          className="size-4 accent-primary"
          disabled={fieldsDisabled}
          {...register('available')}
        />
        <Label htmlFor="available">Disponible</Label>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="authorId">Autor</Label>
        <Select
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
        </Select>
        {errors.authorId ? (
          <p role="alert" data-testid="error-authorId" className="text-sm text-destructive">
            {errors.authorId.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="publisherId">Editorial</Label>
        <Select
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
        </Select>
        {errors.publisherId ? (
          <p role="alert" data-testid="error-publisherId" className="text-sm text-destructive">
            {errors.publisherId.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="genreId">Género</Label>
        <Select
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
        </Select>
        {errors.genreId ? (
          <p role="alert" data-testid="error-genreId" className="text-sm text-destructive">
            {errors.genreId.message}
          </p>
        ) : null}
      </div>

      {onSelectedFileChange != null &&
      onImageValidationErrorChange != null ? (
        <BookImageField
          selectedFile={selectedFile}
          onSelectedFileChange={onSelectedFileChange}
          validationError={imageValidationError}
          onValidationErrorChange={onImageValidationErrorChange}
          existingImageUrl={existingImageUrl}
          disabled={fieldsDisabled}
          uploadRetry={uploadRetry}
        />
      ) : null}

      {lookupsError ? (
        <p role="alert" data-testid="book-form-lookups-error" className="text-sm text-destructive">
          {lookupsError}
        </p>
      ) : null}

      {formError ? (
        <p role="alert" data-testid="book-form-error" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={submitDisabled}>
        {isSubmitting ? 'Guardando…' : submitLabel}
      </Button>
    </form>
  );
}
