import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  AuthProvider,
  createMemoryTokenStorage,
} from '../features/auth/auth-context';
import { AppHeader } from './AppHeader';
import { AppLayout } from './AppLayout';

describe('AppHeader y AppLayout (T21)', () => {
  afterEach(() => {
    cleanup();
  });

  it('muestra CMPC Libros y el botón de cerrar sesión', () => {
    const storage = createMemoryTokenStorage();
    storage.setAccessToken('token');

    render(
      <MemoryRouter>
        <AuthProvider storage={storage}>
          <AppLayout>
            <p>contenido</p>
          </AppLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('CMPC Libros')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
    expect(screen.getByText('contenido')).toBeTruthy();
  });

  it('el click en cerrar sesión llama a logout', () => {
    const storage = createMemoryTokenStorage();
    storage.setAccessToken('token');

    render(
      <MemoryRouter>
        <AuthProvider storage={storage}>
          <AppHeader />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(storage.getAccessToken()).toBeNull();
  });
});
