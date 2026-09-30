import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAuthor,
  listAuthors,
  listGenres,
  listPublishers,
} from '../api/lookups.api';

export const AUTHORS_QUERY_KEY = 'authors' as const;
export const PUBLISHERS_QUERY_KEY = 'publishers' as const;
export const GENRES_QUERY_KEY = 'genres' as const;

export function useAuthorsQuery() {
  return useQuery({
    queryKey: [AUTHORS_QUERY_KEY],
    queryFn: listAuthors,
  });
}

export function usePublishersQuery() {
  return useQuery({
    queryKey: [PUBLISHERS_QUERY_KEY],
    queryFn: listPublishers,
  });
}

export function useGenresQuery() {
  return useQuery({
    queryKey: [GENRES_QUERY_KEY],
    queryFn: listGenres,
  });
}

export function useCreateAuthorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createAuthor(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [AUTHORS_QUERY_KEY] });
    },
  });
}
