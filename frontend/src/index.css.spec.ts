import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe('paleta CMPC en variables CSS (T21)', () => {
  it('define el verde primario y el gris de texto/encabezados', () => {
    const rootStart = css.indexOf(':root {');
    const darkStart = css.indexOf('.dark {');
    const rootBlock = css.slice(rootStart, darkStart);

    expect(rootBlock).toContain('--primary: #5B9A3C');
    expect(rootBlock).toContain('--foreground: #4A4A4A');
    expect(rootBlock).toContain('--card-foreground: #4A4A4A');
  });
});
