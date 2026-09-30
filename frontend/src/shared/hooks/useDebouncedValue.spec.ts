import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import {
  DEFAULT_DEBOUNCE_MS,
  useDebouncedValue,
} from './useDebouncedValue';

describe('useDebouncedValue (T15)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('retorna el valor inicial de inmediato', () => {
    const { result } = renderHook(() => useDebouncedValue('hola'));
    expect(result.current).toBe('hola');
  });

  it('N cambios rápidos → un solo valor tras ~300 ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DEFAULT_DEBOUNCE_MS),
      { initialProps: { value: '' } },
    );

    rerender({ value: 'c' });
    rerender({ value: 'ca' });
    rerender({ value: 'cas' });
    rerender({ value: 'casa' });

    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS - 1);
    });
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('casa');
  });

  it('respeta delay personalizado', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'ab' });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });
});
