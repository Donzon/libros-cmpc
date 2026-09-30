import { Prisma } from '@prisma/client';
import {
  BookSortBy,
  BookSortOrder,
  ListBooksQueryDto,
} from './dto/list-books-query.dto';

export type BooksQueryInput = Partial<
  Pick<
    ListBooksQueryDto,
    | 'search'
    | 'genreId'
    | 'publisherId'
    | 'authorId'
    | 'available'
    | 'sortBy'
    | 'sortOrder'
  >
>;

export function buildBooksWhere(
  query: BooksQueryInput,
): Prisma.BookWhereInput {
  const where: Prisma.BookWhereInput = { deletedAt: null };

  if (query.genreId !== undefined) {
    where.genreId = query.genreId;
  }
  if (query.publisherId !== undefined) {
    where.publisherId = query.publisherId;
  }
  if (query.authorId !== undefined) {
    where.authorId = query.authorId;
  }
  if (query.available !== undefined) {
    where.available = query.available;
  }

  const search = query.search?.trim();
  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  return where;
}

export function buildBooksOrderBy(
  query: Pick<BooksQueryInput, 'sortBy' | 'sortOrder'>,
): Prisma.BookOrderByWithRelationInput {
  const sortBy: BookSortBy = query.sortBy ?? 'title';
  const sortOrder: BookSortOrder = query.sortOrder ?? 'asc';

  if (sortBy === 'author') {
    return { author: { name: sortOrder } };
  }

  return { [sortBy]: sortOrder };
}
