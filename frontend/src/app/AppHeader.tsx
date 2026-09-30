import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../features/auth/hooks/useAuth';

export function AppHeader() {
  const { logout } = useAuth();

  return (
    <header className="border-b bg-card" data-testid="app-header">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/books" className="text-lg font-semibold text-foreground">
          CMPC Libros
        </Link>
        <Button type="button" variant="outline" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
