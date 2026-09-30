import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../features/auth/auth-context';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { BookCreatePage } from '../features/books/pages/BookCreatePage';
import { BookDetailPage } from '../features/books/pages/BookDetailPage';
import { BookEditPage } from '../features/books/pages/BookEditPage';
import { BooksListPage } from '../features/books/pages/BooksListPage';

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* El listado es la home real; ProtectedRoute deriva al login si no hay sesión. */}
        <Route path="/" element={<Navigate to="/books" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/books"
          element={
            <ProtectedRoute>
              <BooksListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/books/new"
          element={
            <ProtectedRoute>
              <BookCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/books/:id/edit"
          element={
            <ProtectedRoute>
              <BookEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/books/:id"
          element={
            <ProtectedRoute>
              <BookDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
