import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppQueryProvider, createAppQueryClient } from '../shared/providers/query-client';
import { AuthProvider, createMemoryTokenStorage } from '../features/auth/auth-context';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { HomePage } from './pages/placeholders';

describe('App scaffold', () => {
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
