import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppQueryProvider } from '../../../shared/providers/query-client';
import { HttpError } from '../../../shared/api/http-client';
import { BookCreatePage } from './BookCreatePage';
import { BookEditPage } from './BookEditPage';

vi.mock('../api/books.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/books.api')>();
  return {
    ...actual,
    getBook: vi.fn(),
    createBook: vi.fn(),
    updateBook: vi.fn(),
    uploadBookImage: vi.fn(),
  };
});

vi.mock('../api/lookups.api', () => ({
  listAuthors: vi.fn(),
  listPublishers: vi.fn(),
  listGenres: vi.fn(),
}));

import {
  createBook,
  getBook,
  updateBook,
  uploadBookImage,
  type BookResponse,
} from '../api/books.api';
import {
  listAuthors,
  listGenres,
  listPublishers,
} from '../api/lookups.api';

const createBookMock = vi.mocked(createBook);
const getBookMock = vi.mocked(getBook);
const updateBookMock = vi.mocked(updateBook);
const uploadBookImageMock = vi.mocked(uploadBookImage);
const listAuthorsMock = vi.mocked(listAuthors);
const listPublishersMock = vi.mocked(listPublishers);
const listGenresMock = vi.mocked(listGenres);

const AUTHOR_ID = 'a1111111-1111-4111-8111-111111111111';
const PUBLISHER_ID = 'b1111111-1111-4111-8111-111111111111';
const GENRE_ID = 'c1111111-1111-4111-8111-111111111111';
const BOOK_ID = 'd1111111-1111-4111-8111-111111111111';

function createBookResponse(
  overrides: Partial<BookResponse> = {},
): BookResponse {
  return {
    id: overrides.id ?? BOOK_ID,
    title: overrides.title ?? 'El Quijote',
    price: overrides.price ?? '19.99',
    available: overrides.available ?? true,
    imagePath: overrides.imagePath ?? null,
    imageUrl: overrides.imageUrl ?? null,
    authorId: overrides.authorId ?? AUTHOR_ID,
    publisherId: overrides.publisherId ?? PUBLISHER_ID,
    genreId: overrides.genreId ?? GENRE_ID,
    author: overrides.author ?? { id: AUTHOR_ID, name: 'Cervantes' },
    publisher: overrides.publisher ?? {
      id: PUBLISHER_ID,
      name: 'Planeta',
    },
    genre: overrides.genre ?? { id: GENRE_ID, name: 'Clásico' },
  };
}

function renderWithProviders(
  ui: React.ReactNode,
  initialPath: string,
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <AppQueryProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/books" element={<p data-testid="books-list">Listado</p>} />
          <Route path="/books/new" element={ui} />
          <Route path="/books/:id/edit" element={ui} />
          <Route
            path="/books/:id"
            element={<p data-testid="book-detail-stub">Detalle</p>}
          />
        </Routes>
      </MemoryRouter>
    </AppQueryProvider>,
  );
}

async function fillValidCreateForm() {
  await screen.findByTestId('book-form');
  await screen.findByRole('option', { name: 'Cervantes' });

  fireEvent.change(screen.getByLabelText('Título'), {
    target: { value: 'Nuevo título' },
  });
  fireEvent.change(screen.getByLabelText('Precio'), {
    target: { value: '12.50' },
  });
  fireEvent.change(screen.getByLabelText('Autor'), {
    target: { value: AUTHOR_ID },
  });
  fireEvent.change(screen.getByLabelText('Editorial'), {
    target: { value: PUBLISHER_ID },
  });
  fireEvent.change(screen.getByLabelText('Género'), {
    target: { value: GENRE_ID },
  });

  await waitFor(() => {
    expect(
      (screen.getByRole('button', { name: 'Crear libro' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
}

describe('Book create/edit pages (T16/T17)', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:mock-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    listAuthorsMock.mockResolvedValue([
      { id: AUTHOR_ID, name: 'Cervantes' },
    ]);
    listPublishersMock.mockResolvedValue([
      { id: PUBLISHER_ID, name: 'Planeta' },
    ]);
    listGenresMock.mockResolvedValue([{ id: GENRE_ID, name: 'Clásico' }]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it(
    'create llama POST /books y navega al detalle',
    async () => {
      createBookMock.mockResolvedValue(createBookResponse());

      renderWithProviders(<BookCreatePage />, '/books/new');
      await fillValidCreateForm();
      fireEvent.click(screen.getByRole('button', { name: 'Crear libro' }));

      await waitFor(() => {
        expect(createBookMock).toHaveBeenCalledWith({
          title: 'Nuevo título',
          price: '12.50',
          available: true,
          authorId: AUTHOR_ID,
          publisherId: PUBLISHER_ID,
          genreId: GENRE_ID,
        });
      });

      expect(uploadBookImageMock).not.toHaveBeenCalled();
      await screen.findByTestId('book-detail-stub');
    },
    15_000,
  );

  it('edit carga valores iniciales y llama PATCH /books/:id', async () => {
    getBookMock.mockResolvedValue(
      createBookResponse({ title: 'Original', price: '9.00' }),
    );
    updateBookMock.mockResolvedValue(
      createBookResponse({ title: 'Editado', price: '11.00' }),
    );

    renderWithProviders(<BookEditPage />, `/books/${BOOK_ID}/edit`);

    await screen.findByTestId('book-form');
    await screen.findByRole('option', { name: 'Cervantes' });

    expect(getBookMock).toHaveBeenCalledWith(BOOK_ID);
    expect(screen.getByLabelText('Título')).toHaveProperty(
      'value',
      'Original',
    );
    expect(screen.getByLabelText('Precio')).toHaveProperty('value', '9.00');
    expect(screen.getByLabelText('Autor')).toHaveProperty(
      'value',
      AUTHOR_ID,
    );

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Editado' },
    });
    fireEvent.change(screen.getByLabelText('Precio'), {
      target: { value: '11.00' },
    });

    await waitFor(() => {
      expect(
        (
          screen.getByRole('button', {
            name: 'Guardar cambios',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(updateBookMock).toHaveBeenCalledWith(BOOK_ID, {
        title: 'Editado',
        price: '11.00',
        available: true,
        authorId: AUTHOR_ID,
        publisherId: PUBLISHER_ID,
        genreId: GENRE_ID,
      });
    });

    await screen.findByTestId('book-detail-stub');
  });

  it('los selects cargan lookups en create', async () => {
    renderWithProviders(<BookCreatePage />, '/books/new');

    await screen.findByTestId('book-form');

    expect(listAuthorsMock).toHaveBeenCalled();
    expect(listPublishersMock).toHaveBeenCalled();
    expect(listGenresMock).toHaveBeenCalled();

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Cervantes' }),
      ).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Planeta' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Clásico' })).toBeTruthy();
    });
  });

  it('si create ok y upload falla, muestra reintento sin segundo create (T17)', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'cover.jpg', {
      type: 'image/jpeg',
    });
    createBookMock.mockResolvedValue(createBookResponse());
    uploadBookImageMock.mockRejectedValueOnce(
      new HttpError(500, 'Upload failed'),
    );
    uploadBookImageMock.mockResolvedValueOnce(
      createBookResponse({
        imageUrl: '/uploads/books/x.jpg',
      }),
    );

    renderWithProviders(<BookCreatePage />, '/books/new');
    await fillValidCreateForm();

    fireEvent.change(screen.getByTestId('book-image-input'), {
      target: { files: [file] },
    });
    await screen.findByTestId('book-image-preview');

    fireEvent.click(screen.getByRole('button', { name: 'Crear libro' }));

    await screen.findByTestId('book-image-upload-retry');
    expect(createBookMock).toHaveBeenCalledTimes(1);
    expect(uploadBookImageMock).toHaveBeenCalledTimes(1);
    expect(uploadBookImageMock).toHaveBeenCalledWith(BOOK_ID, file);

    fireEvent.click(screen.getByTestId('book-image-retry-button'));

    await waitFor(() => {
      expect(uploadBookImageMock).toHaveBeenCalledTimes(2);
    });
    expect(createBookMock).toHaveBeenCalledTimes(1);
    await screen.findByTestId('book-detail-stub');
  });

  it('edit: si PATCH ok y upload falla, reintenta solo la subida (T18 gap)', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'cover.jpg', {
      type: 'image/jpeg',
    });
    getBookMock.mockResolvedValue(createBookResponse({ title: 'Original' }));
    updateBookMock.mockResolvedValue(createBookResponse({ title: 'Editado' }));
    uploadBookImageMock.mockRejectedValueOnce(
      new HttpError(500, 'Upload failed'),
    );
    uploadBookImageMock.mockResolvedValueOnce(
      createBookResponse({ imageUrl: '/uploads/books/x.jpg' }),
    );

    renderWithProviders(<BookEditPage />, `/books/${BOOK_ID}/edit`);
    await screen.findByTestId('book-form');
    await screen.findByRole('option', { name: 'Cervantes' });

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Editado' },
    });
    fireEvent.change(screen.getByTestId('book-image-input'), {
      target: { files: [file] },
    });
    await screen.findByTestId('book-image-preview');

    await waitFor(() => {
      expect(
        (
          screen.getByRole('button', {
            name: 'Guardar cambios',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByTestId('book-image-upload-retry');
    expect(updateBookMock).toHaveBeenCalledTimes(1);
    expect(uploadBookImageMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('book-image-retry-button'));

    await waitFor(() => {
      expect(uploadBookImageMock).toHaveBeenCalledTimes(2);
    });
    expect(updateBookMock).toHaveBeenCalledTimes(1);
    await screen.findByTestId('book-detail-stub');
  });
});
