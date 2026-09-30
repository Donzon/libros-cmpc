import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { BookImageField } from './BookImageField';

describe('BookImageField (T17)', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-preview');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra preview con object URL al seleccionar un archivo válido', () => {
    const onSelectedFileChange = vi.fn();
    const onValidationErrorChange = vi.fn();
    const file = new File([new Uint8Array([1, 2, 3])], 'cover.jpg', {
      type: 'image/jpeg',
    });

    const { rerender } = render(
      <BookImageField
        selectedFile={null}
        onSelectedFileChange={onSelectedFileChange}
        validationError={null}
        onValidationErrorChange={onValidationErrorChange}
      />,
    );

    const input = screen.getByTestId('book-image-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onValidationErrorChange).toHaveBeenCalledWith(null);
    expect(onSelectedFileChange).toHaveBeenCalledWith(file);

    rerender(
      <BookImageField
        selectedFile={file}
        onSelectedFileChange={onSelectedFileChange}
        validationError={null}
        onValidationErrorChange={onValidationErrorChange}
      />,
    );

    expect(createObjectURL).toHaveBeenCalledWith(file);
    const preview = screen.getByTestId(
      'book-image-preview',
    ) as HTMLImageElement;
    expect(preview.src).toBe('blob:mock-preview');
  });

  it('rechaza tipo inválido y no selecciona archivo', () => {
    const onSelectedFileChange = vi.fn();
    const onValidationErrorChange = vi.fn();
    const file = new File([new Uint8Array([1])], 'doc.pdf', {
      type: 'application/pdf',
    });

    render(
      <BookImageField
        selectedFile={null}
        onSelectedFileChange={onSelectedFileChange}
        validationError={null}
        onValidationErrorChange={onValidationErrorChange}
      />,
    );

    fireEvent.change(screen.getByTestId('book-image-input'), {
      target: { files: [file] },
    });

    expect(onSelectedFileChange).toHaveBeenCalledWith(null);
    expect(onValidationErrorChange).toHaveBeenCalledWith(
      expect.stringMatching(/JPEG, PNG o WebP/i),
    );
  });
});
