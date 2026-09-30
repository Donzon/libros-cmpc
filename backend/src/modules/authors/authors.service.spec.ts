import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorsService } from './authors.service';

describe('AuthorsService', () => {
  let service: AuthorsService;
  let findMany: jest.Mock;
  let findFirst: jest.Mock;
  let create: jest.Mock;
  let auditLogCreate: jest.Mock;
  let transaction: jest.Mock;

  const userId = '11111111-1111-1111-1111-111111111111';
  const author = { id: 'a1', name: 'Bolaño' };

  beforeEach(async () => {
    findMany = jest.fn();
    findFirst = jest.fn();
    create = jest.fn();
    auditLogCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });
    transaction = jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          author: { create },
          auditLog: { create: auditLogCreate },
        };
        return callback(tx);
      },
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorsService,
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            author: { findMany, findFirst, create },
            $transaction: transaction,
          },
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

  describe('create', () => {
    it('crea el autor y registra auditoría CREATE en la misma tx', async () => {
      findFirst.mockResolvedValue(null);
      create.mockResolvedValue(author);

      await expect(
        service.create({ name: 'Bolaño' }, userId),
      ).resolves.toEqual(author);

      expect(findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'Bolaño', mode: 'insensitive' } },
        select: { id: true, name: true },
      });
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        data: { name: 'Bolaño' },
        select: { id: true, name: true },
      });
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: {
          userId,
          action: AuditAction.CREATE,
          entity: 'Author',
          entityId: author.id,
        },
      });
    });

    it('reutiliza un autor existente (nombre case-insensitive) sin crear otro', async () => {
      findFirst.mockResolvedValue(author);

      await expect(
        service.create({ name: 'bolaño' }, userId),
      ).resolves.toEqual(author);

      expect(create).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      expect(auditLogCreate).not.toHaveBeenCalled();
    });

    it('si hay carrera por unique, devuelve el autor ya persistido', async () => {
      findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(author);
      create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '6.0.0',
        }),
      );

      await expect(
        service.create({ name: 'Bolaño' }, userId),
      ).resolves.toEqual(author);

      expect(findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
