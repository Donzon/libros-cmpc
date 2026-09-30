import { describe, expect, it } from 'vitest';
import {
  MAX_BOOK_IMAGE_BYTES,
  validateBookImage,
} from './book-image';

function makeFile(
  name: string,
  type: string,
  size: number,
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('validateBookImage (T17)', () => {
  it('acepta JPEG/PNG/WebP dentro del límite', () => {
    expect(
      validateBookImage(makeFile('a.jpg', 'image/jpeg', 100)),
    ).toEqual({ ok: true });
    expect(
      validateBookImage(makeFile('a.png', 'image/png', 100)),
    ).toEqual({ ok: true });
    expect(
      validateBookImage(makeFile('a.webp', 'image/webp', 100)),
    ).toEqual({ ok: true });
  });

  it('rechaza tipos no admitidos', () => {
    const result = validateBookImage(
      makeFile('a.pdf', 'application/pdf', 100),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/JPEG, PNG o WebP/i);
    }
  });

  it('rechaza archivos que superan MAX_BOOK_IMAGE_BYTES', () => {
    const result = validateBookImage(
      makeFile('big.jpg', 'image/jpeg', MAX_BOOK_IMAGE_BYTES + 1),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/no puede superar/i);
    }
  });
});
