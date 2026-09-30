import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './download-blob';

describe('downloadBlob', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('crea un object URL, dispara download y lo revoca', () => {
    const createObjectURL = vi.fn(() => 'blob:books-csv');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL, revokeObjectURL }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const blob = new Blob(['titulo,autor'], { type: 'text/csv' });
    downloadBlob(blob, 'books.csv');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:books-csv');
  });
});
