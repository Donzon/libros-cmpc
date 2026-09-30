import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { AppQueryProvider, createAppQueryClient } from './query-client';

function QueryClientProbe() {
  const queryClient = useQueryClient();
  return <p>query-client-ready:{String(Boolean(queryClient))}</p>;
}

describe('AppQueryProvider', () => {
  it('monta sin crash y expone QueryClient a los hijos', () => {
    const client = createAppQueryClient();

    expect(() => {
      render(
        <AppQueryProvider client={client}>
          <QueryClientProbe />
        </AppQueryProvider>,
      );
    }).not.toThrow();

    expect(screen.getByText('query-client-ready:true')).toBeTruthy();
  });
});
