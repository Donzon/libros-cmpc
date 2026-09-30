import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBook,
  updateBook,
  uploadBookImage,
  type CreateBookPayload,
  type UpdateBookPayload,
} from '../api/books.api';
import { bookDetailQueryKey } from './useBookQuery';
import { BOOKS_QUERY_KEY } from './useBooksQuery';

export function useCreateBookMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookPayload) => createBook(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [BOOKS_QUERY_KEY] });
    },
  });
}

export function useUpdateBookMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateBookPayload;
    }) => updateBook(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [BOOKS_QUERY_KEY] }),
        queryClient.invalidateQueries({
          queryKey: bookDetailQueryKey(variables.id),
        }),
      ]);
    },
  });
}

export function useUploadBookImageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadBookImage(id, file),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [BOOKS_QUERY_KEY] }),
        queryClient.invalidateQueries({
          queryKey: bookDetailQueryKey(variables.id),
        }),
      ]);
    },
  });
}
