import { useQuery } from '@tanstack/react-query';
import { getBook } from '../api/books.api';
import { BOOKS_QUERY_KEY } from './useBooksQuery';

export function bookDetailQueryKey(id: string) {
  return [BOOKS_QUERY_KEY, 'detail', id] as const;
}

export function useBookQuery(id: string | undefined) {
  return useQuery({
    queryKey: bookDetailQueryKey(id ?? ''),
    queryFn: () => getBook(id!),
    enabled: typeof id === 'string' && id.length > 0,
  });
}
