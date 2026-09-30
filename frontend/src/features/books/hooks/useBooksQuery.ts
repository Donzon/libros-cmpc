import { useQuery } from '@tanstack/react-query';
import { listBooks, type ListBooksParams } from '../api/books.api';

export const BOOKS_QUERY_KEY = 'books' as const;

export const DEFAULT_BOOKS_PAGE = 1;
export const DEFAULT_BOOKS_LIMIT = 20;

export type UseBooksQueryParams = ListBooksParams;

export type BooksQueryKeyParams = {
  page: number;
  limit: number;
  search?: string;
  genreId?: string;
  publisherId?: string;
  authorId?: string;
  available?: boolean;
  sortBy?: ListBooksParams['sortBy'];
  sortOrder?: ListBooksParams['sortOrder'];
};

export function booksQueryKey(
  params: BooksQueryKeyParams,
): readonly [typeof BOOKS_QUERY_KEY, BooksQueryKeyParams] {
  return [BOOKS_QUERY_KEY, params] as const;
}

export function useBooksQuery(params: UseBooksQueryParams = {}) {
  const page = params.page ?? DEFAULT_BOOKS_PAGE;
  const limit = params.limit ?? DEFAULT_BOOKS_LIMIT;

  const queryParams: BooksQueryKeyParams = {
    page,
    limit,
    search: params.search,
    genreId: params.genreId,
    publisherId: params.publisherId,
    authorId: params.authorId,
    available: params.available,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return useQuery({
    queryKey: booksQueryKey(queryParams),
    queryFn: () => listBooks(queryParams),
  });
}
