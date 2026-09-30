import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renderiza el título del scaffold', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'CMPC-libros' })).toBeTruthy();
  });
});
