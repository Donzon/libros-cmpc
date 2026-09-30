import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  BooksPlaceholderPage,
  HomePage,
  LoginPage,
} from './pages/placeholders';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/books" element={<BooksPlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
