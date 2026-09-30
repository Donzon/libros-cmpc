import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { BookForm } from './BookForm';
import type { BookFormValues } from '../schemas/book.schema';

const AUTHOR_ID = 'a1111111-1111-4111-8111-111111111111';
const PUBLISHER_ID = 'b1111111-1111-4111-8111-111111111111';
const GENRE_ID = 'c1111111-1111-4111-8111-111111111111';

const authors = [{ id: AUTHOR_ID, name: 'Cervantes' }];
const publishers = [{ id: PUBLISHER_ID, name: 'Planeta' }];
const genres = [{ id: GENRE_ID, name: 'Clásico' }];

const validExistingAuthor: BookFormValues = {
  title: 'El Quijote',
  price: '19.99',
  available: true,
  authorMode: 'existing',
  authorId: AUTHOR_ID,
  authorName: '',
  publisherId: PUBLISHER_ID,
  genreId: GENRE_ID,
};

describe('BookForm (T16)', () => {
  afterEach(() => {
    cleanup();
  });

  it('muestra error de campo inválido y bloquea submit', async () => {
    const onSubmit = vi.fn();

    render(
      <BookForm
        authors={authors}
        publishers={publishers}
        genres={genres}
        submitLabel="Crear libro"
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-title')).toBeTruthy();
    });

    const submit = screen.getByRole('button', { name: 'Crear libro' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Ok' },
    });
    fireEvent.change(screen.getByLabelText('Precio'), {
      target: { value: 'abc' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-price')).toBeTruthy();
    });
    expect(
      (screen.getByRole('button', { name: 'Crear libro' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('carga options de lookups en los selects', async () => {
    render(
      <BookForm
        authors={authors}
        publishers={publishers}
        genres={genres}
        submitLabel="Crear libro"
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('option', { name: 'Cervantes' }),
    ).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Planeta' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Clásico' })).toBeTruthy();
  });

  it('envía valores válidos al completar el formulario con un autor existente', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <BookForm
        authors={authors}
        publishers={publishers}
        genres={genres}
        submitLabel="Crear libro"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: validExistingAuthor.title },
    });
    fireEvent.change(screen.getByLabelText('Precio'), {
      target: { value: validExistingAuthor.price },
    });
    fireEvent.change(screen.getByTestId('book-form-author'), {
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

    fireEvent.click(screen.getByRole('button', { name: 'Crear libro' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(validExistingAuthor);
    });
  });

  it('permite registrar un autor nuevo en lugar de elegir uno de la lista', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <BookForm
        authors={authors}
        publishers={publishers}
        genres={genres}
        submitLabel="Crear libro"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Rayuela' },
    });
    fireEvent.change(screen.getByLabelText('Precio'), {
      target: { value: '15.00' },
    });
    fireEvent.click(screen.getByTestId('author-mode-new'));
    fireEvent.change(screen.getByLabelText('Nombre del autor'), {
      target: { value: 'Julio Cortázar' },
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

    fireEvent.click(screen.getByRole('button', { name: 'Crear libro' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Rayuela',
        price: '15.00',
        available: true,
        authorMode: 'new',
        authorId: '',
        authorName: 'Julio Cortázar',
        publisherId: PUBLISHER_ID,
        genreId: GENRE_ID,
      });
    });
  });
});
