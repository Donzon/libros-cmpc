import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  const findUnique = jest.fn();
  const prisma = {
    user: { findUnique },
  } as unknown as PrismaService;

  const service = new UsersService(prisma);

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('findByEmail consulta por email', async () => {
    const user = {
      id: 'u1',
      email: 'demo@cmpc.test',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    findUnique.mockResolvedValue(user);

    await expect(service.findByEmail('demo@cmpc.test')).resolves.toEqual(user);
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'demo@cmpc.test' },
    });
  });

  it('findById consulta por id', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.findById('missing-id')).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-id' },
    });
  });
});
