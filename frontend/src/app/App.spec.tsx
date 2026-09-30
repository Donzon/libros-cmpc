import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { AppRoutes } from './router';
import { AppQueryProvider, createAppQueryClient } from '../shared/providers/query-client';
import { AuthProvider, createMemoryTokenStorage } from '../features/auth/auth-context';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { HomePage } from './pages/placeholders';

vi.mock('./router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./router')>();
  return {
    ...actual,
    // Evita BrowserRouter (historial global) en el test de App.
    AppRouter: () => <div data-testid="app-router-stub">Router</div>,
  };
});

describe('App scaffold', () => {
  afterEach(() => {
    cleanup();
  });

  it('App monta providers y el router', () => {
    render(<App />);
    expect(screen.getByTestId('app-router-stub')).toBeTruthy();
  });

  it('AppRoutes redirige rutas desconocidas a home', () => {
    render(
      <AppQueryProvider client={createAppQueryClient()}>
        <MemoryRouter initialEntries={['/ruta-inexistente']}>
          <AppRoutes />
        </MemoryRouter>
      </AppQueryProvider>,
    );
    expect(screen.getByRole('heading', { name: 'CMPC-libros' })).toBeTruthy();
  });

  it('renderiza la home placeholder con React Query', () => {
    render(
      <AppQueryProvider client={createAppQueryClient()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </MemoryRouter>
      </AppQueryProvider>,
    );

    expect(screen.getByRole('heading', { name: 'CMPC-libros' })).toBeTruthy();
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
