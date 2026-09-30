type LoadingStateProps = {
  message?: string;
};

export function LoadingState({
  message = 'Cargando…',
}: LoadingStateProps) {
  return (
    <p role="status" data-testid="loading-state">
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
    <p data-testid="empty-state">{message}</p>
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
    <div role="alert" data-testid="error-state">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
