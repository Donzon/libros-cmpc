import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { AppRoutes } from './router';
import { AppQueryProvider, createAppQueryClient } from '../shared/providers/query-client';
import { AuthProvider, createMemoryTokenStorage } from '../features/auth/auth-context';
import { LoginPage } from '../features/auth/pages/LoginPage';

vi.mock('./router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./router')>();
  return {
    ...actual,
    // Evita BrowserRouter (historial global) en el test de App.
    AppRouter: () => <div data-testid="app-router-stub">Router</div>,
  };
});

function renderAppRoutes(initialPath: string) {
  return render(
    <AppQueryProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </AppQueryProvider>,
  );
}

describe('App scaffold', () => {
  beforeEach(() => {
    // AppRoutes usa el tokenStorage real: sin limpiar, la sesión filtra entre tests.
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('App monta providers y el router', () => {
    render(<App />);
    expect(screen.getByTestId('app-router-stub')).toBeTruthy();
  });

  it('la raíz apunta al listado y sin sesión termina en el login', () => {
    renderAppRoutes('/');
    expect(screen.getByRole('heading', { name: 'Login' })).toBeTruthy();
  });

  it('AppRoutes redirige rutas desconocidas a la raíz', () => {
    renderAppRoutes('/ruta-inexistente');
    expect(screen.getByRole('heading', { name: 'Login' })).toBeTruthy();
  });

  it('renderiza la ruta de login', () => {
    render(
      <AppQueryProvider client={createAppQueryClient()}>
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider storage={createMemoryTokenStorage()}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </AppQueryProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Login' })).toBeTruthy();
  });
});
