import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import {
  BookResponse,
  BookWithRelations,
  toBookResponse,
} from './mappers/book.mapper';

export type BooksListResponse = {
  data: BookResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const bookInclude = {
  author: { select: { id: true, name: true } },
  publisher: { select: { id: true, name: true } },
  genre: { select: { id: true, name: true } },
} satisfies Prisma.BookInclude;

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookDto): Promise<BookResponse> {
    const book = await this.prisma.book.create({
      data: {
        title: dto.title,
        price: dto.price,
        available: dto.available,
        authorId: dto.authorId,
        publisherId: dto.publisherId,
        genreId: dto.genreId,
      },
      include: bookInclude,
    });

    return toBookResponse(book as BookWithRelations);
  }

  async findAll(): Promise<BooksListResponse> {
    const where: Prisma.BookWhereInput = { deletedAt: null };

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        include: bookInclude,
        orderBy: { title: 'asc' },
      }),
      this.prisma.book.count({ where }),
    ]);

    const page = 1;
    const limit = total === 0 ? 20 : total;
    const totalPages = total === 0 ? 0 : 1;

    return {
      data: (books as BookWithRelations[]).map(toBookResponse),
      meta: { page, limit, total, totalPages },
    };
  }

  async findOne(id: string): Promise<BookResponse> {
    const book = await this.findActiveOrThrow(id);
    return toBookResponse(book);
  }

  async update(id: string, dto: UpdateBookDto): Promise<BookResponse> {
    await this.findActiveOrThrow(id);

    const book = await this.prisma.book.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.available !== undefined ? { available: dto.available } : {}),
        ...(dto.authorId !== undefined ? { authorId: dto.authorId } : {}),
        ...(dto.publisherId !== undefined
          ? { publisherId: dto.publisherId }
          : {}),
        ...(dto.genreId !== undefined ? { genreId: dto.genreId } : {}),
      },
      include: bookInclude,
    });

    return toBookResponse(book as BookWithRelations);
  }

  async remove(id: string): Promise<void> {
    await this.findActiveOrThrow(id);

    await this.prisma.book.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findActiveOrThrow(id: string): Promise<BookWithRelations> {
    const book = await this.prisma.book.findFirst({
      where: { id, deletedAt: null },
      include: bookInclude,
    });

    if (!book) {
      throw new NotFoundException(`Book ${id} not found`);
    }

    return book as BookWithRelations;
  }
}
