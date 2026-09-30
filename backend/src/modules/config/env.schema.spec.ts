import { validateEnv } from './env.schema';

function validEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgresql://cmpc:cmpc@localhost:5432/cmpc_libros',
    JWT_SECRET: 'change-me-use-a-random-string-at-least-32-chars',
    JWT_EXPIRES_IN: '30m',
    PORT: '3000',
    CORS_ORIGIN: 'http://localhost:5173',
    UPLOAD_DIR: './uploads',
    MAX_IMAGE_BYTES: '2097152',
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('acepta un env completo válido', () => {
    const env = validateEnv(validEnv());

    expect(env.DATABASE_URL).toContain('postgresql://');
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.PORT).toBe(3000);
    expect(env.MAX_IMAGE_BYTES).toBe(2_097_152);
  });

  it('falla si falta DATABASE_URL', () => {
    const { DATABASE_URL: _, ...withoutDb } = validEnv();

    expect(() => validateEnv(withoutDb)).toThrow(
      /DATABASE_URL/i,
    );
  });

  it('falla si falta JWT_SECRET', () => {
    const { JWT_SECRET: _, ...withoutJwt } = validEnv();

    expect(() => validateEnv(withoutJwt)).toThrow(/JWT_SECRET/i);
  });

  it('falla si JWT_SECRET tiene menos de 32 caracteres', () => {
    expect(() =>
      validateEnv(validEnv({ JWT_SECRET: 'too-short' })),
    ).toThrow(/JWT_SECRET/i);
  });
});
