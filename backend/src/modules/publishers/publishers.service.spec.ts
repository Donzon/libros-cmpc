import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PublishersService } from './publishers.service';

describe('PublishersService', () => {
  let service: PublishersService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PublishersService,
        {
          provide: PrismaService,
          useValue: { publisher: { findMany } },
        },
      ],
    }).compile();

    service = moduleRef.get(PublishersService);
  });

  it('devuelve { id, name } ordenados por name asc', async () => {
    const rows = [
      { id: 'p1', name: 'Alfaguara' },
      { id: 'p2', name: 'Planeta' },
    ];
    findMany.mockResolvedValue(rows);

    await expect(service.findAll()).resolves.toEqual(rows);

    expect(findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });
});
