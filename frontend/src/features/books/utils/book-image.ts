/** Alineado al default de `MAX_IMAGE_BYTES` del backend (2 MiB). */
export const MAX_BOOK_IMAGE_BYTES = 2_097_152;

export const ACCEPTED_BOOK_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AcceptedBookImageType =
  (typeof ACCEPTED_BOOK_IMAGE_TYPES)[number];

export type BookImageValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function isAcceptedBookImageType(
  type: string,
): type is AcceptedBookImageType {
  return (ACCEPTED_BOOK_IMAGE_TYPES as readonly string[]).includes(type);
}

export function validateBookImage(file: File): BookImageValidationResult {
  if (!isAcceptedBookImageType(file.type)) {
    return {
      ok: false,
      message: 'La imagen debe ser JPEG, PNG o WebP.',
    };
  }

  if (file.size > MAX_BOOK_IMAGE_BYTES) {
    return {
      ok: false,
      message: `La imagen no puede superar ${MAX_BOOK_IMAGE_BYTES} bytes.`,
    };
  }

  return { ok: true };
}
