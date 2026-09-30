import { describe, expect, it, vi } from 'vitest';
import { setUnauthorizedHandler } from './http';

describe('http module', () => {
  it('setUnauthorizedHandler acepta un handler sin lanzar', () => {
    const handler = vi.fn();
    expect(() => setUnauthorizedHandler(handler)).not.toThrow();
    expect(() => setUnauthorizedHandler(undefined)).not.toThrow();
  });
});
