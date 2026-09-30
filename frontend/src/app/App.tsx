import { AppQueryProvider } from '../shared/providers/query-client';
import { AppRouter } from './router';

export function App() {
  return (
    <AppQueryProvider>
      <AppRouter />
    </AppQueryProvider>
  );
}
