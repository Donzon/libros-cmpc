import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppQueryProvider, createAppQueryClient } from '../../shared/providers/query-client';
import * as httpModule from '../../shared/api/http';
import { HttpError } from '../../shared/api/http-client';
import {
  AuthProvider,
  createMemoryTokenStorage,
  useAuth,
} from './auth-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';

function BooksPage() {
  return (
    <main>
      <h1>Libros</h1>
    </main>
  );
}

function TokenProbe() {
  const { accessToken } = useAuth();
  return <span data-testid="auth-token">{accessToken ?? ''}</span>;
}

function renderAuthApp(options: {
  initialPath?: string;
  storage?: ReturnType<typeof createMemoryTokenStorage>;
  loginFn?: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ accessToken: string; expiresIn: string }>;
}) {
  const storage = options.storage ?? createMemoryTokenStorage();

  return {
    storage,
    ...render(
      <AppQueryProvider client={createAppQueryClient()}>
        <MemoryRouter initialEntries={[options.initialPath ?? '/login']}>
          <AuthProvider storage={storage} loginFn={options.loginFn}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/books"
                element={
                  <ProtectedRoute>
                    <BooksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/probe"
                element={
                  <ProtectedRoute>
                    <TokenProbe />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </AppQueryProvider>,
    ),
  };
}

describe('Login UI y rutas protegidas (T13)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    httpModule.setUnauthorizedHandler(undefined);
  });

  it('submit con credenciales llama API y guarda token', async () => {
    const loginFn = vi.fn().mockResolvedValue({
      accessToken: 'persisted.jwt.token',
      expiresIn: '30m',
    });
    const { storage } = renderAuthApp({ loginFn });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@cmpc.local' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Admin123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(loginFn).toHaveBeenCalledWith({
        email: 'admin@cmpc.local',
        password: 'Admin123!',
      });
    });

    await waitFor(() => {
      expect(storage.getAccessToken()).toBe('persisted.jwt.token');
      expect(screen.getByRole('heading', { name: 'Libros' })).toBeTruthy();
    });
  });

  it('ruta protegida sin token redirige a login', async () => {
    renderAuthApp({ initialPath: '/books' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Login' })).toBeTruthy();
    });
    expect(screen.queryByRole('heading', { name: 'Libros' })).toBeNull();
  });

  it('muestra mensaje de error en login fallido', async () => {
    const loginFn = vi
      .fn()
      .mockRejectedValue(new HttpError(401, 'Credenciales inválidas'));

    renderAuthApp({ loginFn });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@cmpc.local' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(
        'Credenciales inválidas',
      );
    });
    expect(screen.getByRole('heading', { name: 'Login' })).toBeTruthy();
  });

  it('ruta protegida con token muestra el contenido', async () => {
    const storage = createMemoryTokenStorage();
    storage.setAccessToken('valid.token');

    renderAuthApp({ initialPath: '/books', storage });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Libros' })).toBeTruthy();
    });
  });

  it('401 (sesión expirada) limpia token y vuelve a login', async () => {
    const storage = createMemoryTokenStorage();
    storage.setAccessToken('expired.token');

    let unauthorizedHandler: (() => void) | undefined;
    const originalSet = httpModule.setUnauthorizedHandler;
    vi.spyOn(httpModule, 'setUnauthorizedHandler').mockImplementation(
      (handler) => {
        unauthorizedHandler = handler;
        originalSet(handler);
      },
    );

    renderAuthApp({ initialPath: '/probe', storage });

    await waitFor(() => {
      expect(screen.getByTestId('auth-token').textContent).toBe('expired.token');
      expect(unauthorizedHandler).toBeTypeOf('function');
    });

    // Simula el callback que dispara el http-client ante un 401
    unauthorizedHandler?.();

    await waitFor(() => {
      expect(storage.getAccessToken()).toBeNull();
      expect(screen.getByRole('heading', { name: 'Login' })).toBeTruthy();
    });
  });
});
