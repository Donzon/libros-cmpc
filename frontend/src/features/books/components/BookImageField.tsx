import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <fieldset
      data-testid="book-image-field"
      disabled={disabled}
      className="grid gap-3 rounded-xl border p-4"
    >
      <legend className="px-1 text-sm font-medium">Imagen (opcional)</legend>

      <div className="grid gap-2">
        <Label htmlFor={inputId}>Archivo de portada</Label>
        <Input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          data-testid="book-image-input"
          disabled={disabled || Boolean(uploadRetry)}
          onChange={handleFileChange}
        />
      </div>

      {validationError ? (
        <p role="alert" data-testid="book-image-validation-error" className="text-sm text-destructive">
          {validationError}
        </p>
      ) : null}

      {previewSrc ? (
        <p>
          <img
            src={previewSrc}
            alt="Vista previa de la portada"
            data-testid="book-image-preview"
            className="max-h-48 rounded-lg border object-contain"
          />
        </p>
      ) : null}

      {uploadRetry ? (
        <div
          data-testid="book-image-upload-retry"
          className="grid gap-3 rounded-lg border border-destructive/30 p-3"
        >
          <p role="alert" className="text-sm text-destructive">
            {uploadRetry.message}
          </p>
          <Button
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
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
