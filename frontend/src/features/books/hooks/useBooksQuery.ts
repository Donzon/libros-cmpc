import { useQuery } from '@tanstack/react-query';
import { listBooks, type ListBooksParams } from '../api/books.api';

export const BOOKS_QUERY_KEY = 'books' as const;

export const DEFAULT_BOOKS_PAGE = 1;
export const DEFAULT_BOOKS_LIMIT = 20;

export type UseBooksQueryParams = ListBooksParams;

export function booksQueryKey(params: {
  page: number;
  limit: number;
}): readonly [typeof BOOKS_QUERY_KEY, { page: number; limit: number }] {
  return [BOOKS_QUERY_KEY, { page: params.page, limit: params.limit }] as const;
}

export function useBooksQuery(params: UseBooksQueryParams = {}) {
  const page = params.page ?? DEFAULT_BOOKS_PAGE;
  const limit = params.limit ?? DEFAULT_BOOKS_LIMIT;

  return useQuery({
    queryKey: booksQueryKey({ page, limit }),
    queryFn: () => listBooks({ page, limit }),
  });
}
