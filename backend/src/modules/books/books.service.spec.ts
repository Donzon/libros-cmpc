import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

describe('BooksService', () => {
  let service: BooksService;
  let create: jest.Mock;
  let findFirst: jest.Mock;
  let findMany: jest.Mock;
  let update: jest.Mock;
  let count: jest.Mock;

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

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: {
            book: { create, findFirst, findMany, update, count },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(BooksService);
  });

  describe('create', () => {
    it('crea y serializa price como string decimal', async () => {
      const dto: CreateBookDto = {
        title: 'La casa de los espíritus',
        price: '19.99',
        available: true,
        authorId: author.id,
        publisherId: publisher.id,
        genreId: genre.id,
      };
      create.mockResolvedValue(buildBook());

      const result = await service.create(dto);

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
      expect(result.price).toBe('19.99');
      expect(typeof result.price).toBe('string');
      expect(result.author).toEqual(author);
      expect(result.publisher).toEqual(publisher);
      expect(result.genre).toEqual(genre);
      expect(result.imageUrl).toBeNull();
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
    it('lista solo no eliminados y excluye soft-deleted vía where', async () => {
      const books = [buildBook()];
      findMany.mockResolvedValue(books);
      count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
        orderBy: { title: 'asc' },
      });
      expect(count).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].price).toBe('19.99');
      expect(result.meta).toEqual({
        page: 1,
        limit: 1,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('update', () => {
    it('actualiza un libro activo', async () => {
      findFirst.mockResolvedValue(buildBook());
      update.mockResolvedValue(
        buildBook({ title: 'Nuevo título', price: new Prisma.Decimal('25.50') }),
      );

      const dto: UpdateBookDto = { title: 'Nuevo título', price: '25.50' };
      const result = await service.update(bookId, dto);

      expect(update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: { title: 'Nuevo título', price: '25.50' },
        include: {
          author: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
        },
      });
      expect(result.title).toBe('Nuevo título');
      expect(result.price).toBe('25.50');
      expect(typeof result.price).toBe('string');
    });

    it('lanza NotFoundException si el libro está soft-deleted', async () => {
      findFirst.mockResolvedValue(null);

      await expect(
        service.update(bookId, { title: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('hace soft delete seteando deletedAt', async () => {
      findFirst.mockResolvedValue(buildBook());
      update.mockResolvedValue(
        buildBook({ deletedAt: new Date('2026-09-29T12:00:00.000Z') }),
      );

      await service.remove(bookId);

      expect(update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('tras soft delete, findOne lanza NotFoundException', async () => {
      findFirst
        .mockResolvedValueOnce(buildBook())
        .mockResolvedValueOnce(null);
      update.mockResolvedValue(
        buildBook({ deletedAt: new Date('2026-09-29T12:00:00.000Z') }),
      );

      await service.remove(bookId);
      await expect(service.findOne(bookId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
