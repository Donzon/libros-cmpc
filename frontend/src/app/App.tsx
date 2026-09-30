import { AppQueryProvider } from '../shared/providers/query-client';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { AppRouter } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <AppQueryProvider>
        <AppRouter />
      </AppQueryProvider>
    </ErrorBoundary>
  );
}
