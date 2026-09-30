import { useEffect, useId, useState } from 'react';
import { resolveBookImageSrc } from '../api/books.api';
import { validateBookImage } from '../utils/book-image';

export type BookImageUploadRetry = {
  message: string;
  onRetry: () => void | Promise<void>;
  isRetrying?: boolean;
};

export type BookImageFieldProps = {
  selectedFile: File | null;
  onSelectedFileChange: (file: File | null) => void;
  validationError: string | null;
  onValidationErrorChange: (error: string | null) => void;
  existingImageUrl?: string | null;
  disabled?: boolean;
  uploadRetry?: BookImageUploadRetry | null;
};

export function BookImageField({
  selectedFile,
  onSelectedFileChange,
  validationError,
  onValidationErrorChange,
  existingImageUrl = null,
  disabled = false,
  uploadRetry = null,
}: BookImageFieldProps) {
  const inputId = useId();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const existingSrc = resolveBookImageSrc(existingImageUrl);
  const previewSrc = objectUrl ?? existingSrc;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      onSelectedFileChange(null);
      onValidationErrorChange(null);
      return;
    }

    const result = validateBookImage(file);
    if (!result.ok) {
      onSelectedFileChange(null);
      onValidationErrorChange(result.message);
      event.target.value = '';
      return;
    }

    onValidationErrorChange(null);
    onSelectedFileChange(file);
  }

  return (
    <fieldset data-testid="book-image-field" disabled={disabled}>
      <legend>Imagen (opcional)</legend>

      <label htmlFor={inputId}>Archivo de portada</label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-testid="book-image-input"
        disabled={disabled || Boolean(uploadRetry)}
        onChange={handleFileChange}
      />

      {validationError ? (
        <p role="alert" data-testid="book-image-validation-error">
          {validationError}
        </p>
      ) : null}

      {previewSrc ? (
        <p>
          <img
            src={previewSrc}
            alt="Vista previa de la portada"
            data-testid="book-image-preview"
          />
        </p>
      ) : null}

      {uploadRetry ? (
        <div data-testid="book-image-upload-retry">
          <p role="alert">{uploadRetry.message}</p>
          <button
            type="button"
            data-testid="book-image-retry-button"
            disabled={uploadRetry.isRetrying || disabled}
            onClick={() => {
              void uploadRetry.onRetry();
            }}
          >
            {uploadRetry.isRetrying
              ? 'Reintentando…'
              : 'Reintentar subida de imagen'}
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
