import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('render roto');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React reporta por consola el error capturado; solo agrega ruido al test.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renderiza los hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('contenido')).toBeTruthy();
    expect(screen.queryByTestId('error-boundary')).toBeNull();
  });

  it('muestra el fallback y notifica onError cuando un hijo lanza', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe('render roto');
  });

  it('el botón de reintento vuelve a renderizar los hijos', () => {
    let shouldFail = true;

    function Flaky() {
      if (shouldFail) {
        throw new Error('render roto');
      }

      return <p>contenido recuperado</p>;
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary')).toBeTruthy();

    shouldFail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByText('contenido recuperado')).toBeTruthy();
    expect(screen.queryByTestId('error-boundary')).toBeNull();
  });
});
