import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FileStorageService } from './file-storage.service';
import { ValidatedImageFile } from './pipes/image-file-validation.pipe';

describe('BooksService', () => {
  let service: BooksService;
  let create: jest.Mock;
  let findFirst: jest.Mock;
  let findMany: jest.Mock;
  let update: jest.Mock;
  let count: jest.Mock;
  let auditLogCreate: jest.Mock;
  let transaction: jest.Mock;
  let buildRelativePath: jest.Mock;
  let write: jest.Mock;
  let deleteIfExists: jest.Mock;

  const userId = '11111111-1111-1111-1111-111111111111';

  const author = {
    id: 'a1111111-1111-4111-8111-111111111111',
    name: 'Allende',
  };
  const publisher = {
    id: 'b2222222-2222-4222-8222-222222222222',
    name: 'Planeta',
  };
  const genre = {
    id: 'c3333333-3333-4333-8333-333333333333',
    name: 'Ficción',
  };

  const bookId = 'd4444444-4444-4444-8444-444444444444';

  function buildBook(overrides: Record<string, unknown> = {}) {
    return {
      id: bookId,
      title: 'La casa de los espíritus',
      price: new Prisma.Decimal('19.99'),
      available: true,
      imagePath: null,
      authorId: author.id,
      publisherId: publisher.id,
      genreId: genre.id,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      author,
      publisher,
      genre,
      ...overrides,
    };
  }

  beforeEach(async () => {
    create = jest.fn();
    findFirst = jest.fn();
    findMany = jest.fn();
    update = jest.fn();
    count = jest.fn();
    auditLogCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });
    buildRelativePath = jest.fn();
    write = jest.fn();
    deleteIfExists = jest.fn();

    transaction = jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          book: { create, update },
          auditLog: { create: auditLogCreate },
        };
        return callback(tx);
      },
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            book: { create, findFirst, findMany, update, count },
            $transaction: transaction,
          },
        },
        {
          provide: FileStorageService,
          useValue: { buildRelativePath, write, deleteIfExists },
        },
      ],
    }).compile();

    service = moduleRef.get(BooksService);
  });

  describe('create', () => {
    it('crea y serializa price como string decimal con audit CREATE en la misma tx', async () => {
      const dto: CreateBookDto = {
        title: 'La casa de los espíritus',
        price: '19.99',
        available: true,
        authorId: author.id,
        publisherId: publisher.id,
        genreId: genre.id,
      };
      create.mockResolvedValue(buildBook());

      const result = await service.create(dto, userId);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          price: dto.price,
          available: dto.available,
          authorId: dto.authorId,
          publisherId: dto.publisherId,
          genreId: dto.genreId,
        },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
      });
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: {
          userId,
          action: AuditAction.CREATE,
          entity: 'Book',
          entityId: bookId,
        },
      });
      expect(result.price).toBe('19.99');
      expect(typeof result.price).toBe('string');
      expect(result.author).toEqual(author);
      expect(result.publisher).toEqual(publisher);
      expect(result.genre).toEqual(genre);
      expect(result.imageUrl).toBeNull();
    });

    it('si audit falla, no queda libro (rollback de $transaction)', async () => {
      const dto: CreateBookDto = {
        title: 'La casa de los espíritus',
        price: '19.99',
        available: true,
        authorId: author.id,
        publisherId: publisher.id,
        genreId: genre.id,
      };
      create.mockResolvedValue(buildBook());
      auditLogCreate.mockRejectedValue(new Error('audit failed'));

      await expect(service.create(dto, userId)).rejects.toThrow(
        'audit failed',
      );
      expect(create).toHaveBeenCalled();
      expect(auditLogCreate).toHaveBeenCalled();
      expect(transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('devuelve el libro activo', async () => {
      findFirst.mockResolvedValue(buildBook({ imagePath: 'books/x.webp' }));

      const result = await service.findOne(bookId);

      expect(findFirst).toHaveBeenCalledWith({
        where: { id: bookId, deletedAt: null },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
      });
      expect(result.id).toBe(bookId);
      expect(result.price).toBe('19.99');
      expect(result.imageUrl).toBe('/uploads/books/x.webp');
    });

    it('lanza NotFoundException si no existe o está soft-deleted', async () => {
      findFirst.mockResolvedValue(null);

      await expect(service.findOne(bookId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('lista solo no eliminados con defaults page=1 limit=20', async () => {
      const books = [buildBook()];
      findMany.mockResolvedValue(books);
      count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
        orderBy: { title: 'asc' },
        skip: 0,
        take: 20,
      });
      expect(count).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].price).toBe('19.99');
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('aplica paginación skip/take y calcula totalPages', async () => {
      findMany.mockResolvedValue([buildBook()]);
      count.mockResolvedValue(45);

      const result = await service.findAll({
        page: 2,
        limit: 20,
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('totalPages es 0 cuando no hay resultados', async () => {
      findMany.mockResolvedValue([]);
      count.mockResolvedValue(0);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('pasa filtros y search al where vía builder', async () => {
      findMany.mockResolvedValue([]);
      count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        search: 'casa',
        genreId: genre.id,
        publisherId: publisher.id,
        authorId: author.id,
        available: false,
        sortBy: 'price',
        sortOrder: 'desc',
      });

      expect(findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          genreId: genre.id,
          publisherId: publisher.id,
          authorId: author.id,
          available: false,
          title: { contains: 'casa', mode: 'insensitive' },
        },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
        orderBy: { price: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('update', () => {
    it('actualiza un libro activo y escribe audit UPDATE', async () => {
      findFirst.mockResolvedValue(buildBook());
      update.mockResolvedValue(
        buildBook({ title: 'Nuevo título', price: new Prisma.Decimal('25.50') }),
      );

      const dto: UpdateBookDto = { title: 'Nuevo título', price: '25.50' };
      const result = await service.update(bookId, dto, userId);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: { title: 'Nuevo título', price: '25.50' },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
      });
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: {
          userId,
          action: AuditAction.UPDATE,
          entity: 'Book',
          entityId: bookId,
        },
      });
      expect(result.title).toBe('Nuevo título');
      expect(result.price).toBe('25.50');
      expect(typeof result.price).toBe('string');
    });

    it('lanza NotFoundException si el libro está soft-deleted', async () => {
      findFirst.mockResolvedValue(null);

      await expect(
        service.update(bookId, { title: 'X' }, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(update).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('hace soft delete seteando deletedAt y escribe audit DELETE', async () => {
      findFirst.mockResolvedValue(buildBook());
      update.mockResolvedValue(
        buildBook({ deletedAt: new Date('2026-09-29T12:00:00.000Z') }),
      );

      await service.remove(bookId, userId);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: {
          userId,
          action: AuditAction.DELETE,
          entity: 'Book',
          entityId: bookId,
        },
      });
    });

    it('tras soft delete, findOne lanza NotFoundException', async () => {
      findFirst
        .mockResolvedValueOnce(buildBook())
        .mockResolvedValueOnce(null);
      update.mockResolvedValue(
        buildBook({ deletedAt: new Date('2026-09-29T12:00:00.000Z') }),
      );

      await service.remove(bookId, userId);
      await expect(service.findOne(bookId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('exportCsv', () => {
    it('exporta CSV con filtros, sin paginación, excluye soft-deleted vía where y audita EXPORT', async () => {
      findMany.mockResolvedValue([buildBook()]);

      const csv = await service.exportCsv(
        {
          page: 2,
          limit: 5,
          search: 'casa',
          genreId: genre.id,
          publisherId: publisher.id,
          authorId: author.id,
          available: true,
          sortBy: 'price',
          sortOrder: 'desc',
        },
        userId,
      );

      expect(findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          genreId: genre.id,
          publisherId: publisher.id,
          authorId: author.id,
          available: true,
          title: { contains: 'casa', mode: 'insensitive' },
        },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
        orderBy: { price: 'desc' },
        take: 10_000,
      });
      expect(findMany.mock.calls[0][0]).not.toHaveProperty('skip');
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: {
          userId,
          action: AuditAction.EXPORT,
          entity: 'Book',
          entityId: null,
          metadata: {
            search: 'casa',
            genreId: genre.id,
            publisherId: publisher.id,
            authorId: author.id,
            available: true,
            sortBy: 'price',
            sortOrder: 'desc',
          },
        },
      });
      expect(csv).toContain('titulo,autor,editorial,genero,precio,disponibilidad');
      expect(csv).toContain('La casa de los espíritus,Allende,Planeta,Ficción,19.99,true');
    });

    it('audita EXPORT con sort defaults cuando no hay filtros', async () => {
      findMany.mockResolvedValue([]);

      const csv = await service.exportCsv(
        {
          page: 1,
          limit: 20,
          sortBy: 'title',
          sortOrder: 'asc',
        },
        userId,
      );

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          take: 10_000,
        }),
      );
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: {
          userId,
          action: AuditAction.EXPORT,
          entity: 'Book',
          entityId: null,
          metadata: {
            sortBy: 'title',
            sortOrder: 'asc',
          },
        },
      });
      expect(csv).toBe('titulo,autor,editorial,genero,precio,disponibilidad');
    });
  });

  describe('uploadImage', () => {
    const file: ValidatedImageFile = {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      extension: 'jpg',
      kind: 'jpeg',
      size: 4,
    };

    it('guarda como books/<bookId>-<timestamp>.<ext>, actualiza imagePath y audit UPDATE', async () => {
      const relativePath = `books/${bookId}-1710000000000.jpg`;
      findFirst.mockResolvedValue(buildBook());
      buildRelativePath.mockReturnValue(relativePath);
      write.mockResolvedValue(undefined);
      deleteIfExists.mockResolvedValue(undefined);
      update.mockResolvedValue(buildBook({ imagePath: relativePath }));

      const result = await service.uploadImage(bookId, file, userId);

      expect(buildRelativePath).toHaveBeenCalledWith(bookId, 'jpg');
      expect(write).toHaveBeenCalledWith(relativePath, file.buffer);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: { imagePath: relativePath },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
      });
      expect(auditLogCreate).toHaveBeenCalledWith({
        data: {
          userId,
          action: AuditAction.UPDATE,
          entity: 'Book',
          entityId: bookId,
          metadata: { imagePath: relativePath },
        },
      });
      expect(deleteIfExists).toHaveBeenCalledWith(null);
      expect(result.imagePath).toBe(relativePath);
      expect(result.imageUrl).toBe(`/uploads/${relativePath}`);
    });

    it('segundo upload borra el archivo anterior', async () => {
      const previous = `books/${bookId}-1000.jpg`;
      const next = `books/${bookId}-2000.webp`;
      findFirst.mockResolvedValue(buildBook({ imagePath: previous }));
      buildRelativePath.mockReturnValue(next);
      write.mockResolvedValue(undefined);
      deleteIfExists.mockResolvedValue(undefined);
      update.mockResolvedValue(buildBook({ imagePath: next }));

      const webpFile: ValidatedImageFile = {
        ...file,
        extension: 'webp',
        kind: 'webp',
      };
      await service.uploadImage(bookId, webpFile, userId);

      expect(deleteIfExists).toHaveBeenCalledWith(previous);
    });

    it('lanza NotFoundException si el libro está soft-deleted', async () => {
      findFirst.mockResolvedValue(null);

      await expect(
        service.uploadImage(bookId, file, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(write).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it('borra el archivo nuevo si falla la actualización en DB', async () => {
      const relativePath = `books/${bookId}-1710000000000.jpg`;
      findFirst.mockResolvedValue(buildBook());
      buildRelativePath.mockReturnValue(relativePath);
      write.mockResolvedValue(undefined);
      deleteIfExists.mockResolvedValue(undefined);
      update.mockRejectedValue(new Error('db down'));

      await expect(service.uploadImage(bookId, file, userId)).rejects.toThrow(
        'db down',
      );
      expect(deleteIfExists).toHaveBeenCalledWith(relativePath);
    });
  });
});
