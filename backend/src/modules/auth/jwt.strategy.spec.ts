import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../users/users.service';
import { EnvConfig } from '../config/env.schema';

describe('JwtStrategy', () => {
  const findById = jest.fn();
  const usersService = { findById } as unknown as UsersService;
  const config = {
    get: jest.fn().mockReturnValue('test-jwt-secret-at-least-32-chars!!'),
  } as unknown as ConfigService<EnvConfig, true>;

  beforeEach(() => {
    findById.mockReset();
  });

  it('validate devuelve userId y email si el usuario existe', async () => {
    findById.mockResolvedValue({
      id: 'user-1',
      email: 'demo@cmpc.test',
    });
    const strategy = new JwtStrategy(config, usersService);

    await expect(
      strategy.validate({ sub: 'user-1', email: 'demo@cmpc.test' }),
    ).resolves.toEqual({ userId: 'user-1', email: 'demo@cmpc.test' });
  });

  it('validate lanza UnauthorizedException si el usuario no existe', async () => {
    findById.mockResolvedValue(null);
    const strategy = new JwtStrategy(config, usersService);

    await expect(
      strategy.validate({ sub: 'missing', email: 'x@y.z' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
