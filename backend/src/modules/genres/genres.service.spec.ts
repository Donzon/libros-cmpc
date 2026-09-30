import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { GenresService } from './genres.service';

describe('GenresService', () => {
  let service: GenresService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GenresService,
        {
          provide: PrismaService,
          useValue: { genre: { findMany } },
        },
      ],
    }).compile();

    service = moduleRef.get(GenresService);
  });

  it('devuelve { id, name } ordenados por name asc', async () => {
    const rows = [
      { id: 'g1', name: 'Ficción' },
      { id: 'g2', name: 'Historia' },
    ];
    findMany.mockResolvedValue(rows);

    await expect(service.findAll()).resolves.toEqual(rows);

    expect(findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });
});
