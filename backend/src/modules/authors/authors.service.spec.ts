import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorsService } from './authors.service';

describe('AuthorsService', () => {
  let service: AuthorsService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorsService,
        {
          provide: PrismaService,
          useValue: { author: { findMany } },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthorsService);
  });

  it('devuelve { id, name } ordenados por name asc', async () => {
    const rows = [
      { id: 'a1', name: 'Allende' },
      { id: 'a2', name: 'Bolaño' },
    ];
    findMany.mockResolvedValue(rows);

    await expect(service.findAll()).resolves.toEqual(rows);

    expect(findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });
});
