import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({
  message = 'Cargando…',
}: LoadingStateProps) {
  return (
    <p
      role="status"
      data-testid="loading-state"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {message}
    </p>
  );
}

type EmptyStateProps = {
  message?: string;
};

export function EmptyState({
  message = 'No hay libros para mostrar.',
}: EmptyStateProps) {
  return (
    <p
      data-testid="empty-state"
      className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
    >
      {message}
    </p>
  );
}

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message = 'No se pudieron cargar los libros.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" data-testid="error-state">
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{message}</p>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
