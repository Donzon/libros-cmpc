import { getApiBaseUrl } from '../../../shared/api/http-client';
import { http } from '../../../shared/api/http';

export type BookRelation = {
  id: string;
  name: string;
};

export type BookListItem = {
  id: string;
  title: string;
  price: string;
  available: boolean;
  imagePath: string | null;
  imageUrl: string | null;
  authorId: string;
  publisherId: string;
  genreId: string;
  author: BookRelation;
  publisher: BookRelation;
  genre: BookRelation;
};

/** Detalle/respuesta de mutación (misma forma que list item para el form). */
export type BookResponse = BookListItem;

export type CreateBookPayload = {
  title: string;
  price: string;
  available: boolean;
  authorId: string;
  publisherId: string;
  genreId: string;
};

export type UpdateBookPayload = Partial<CreateBookPayload>;

export type BooksListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type BooksListResponse = {
  data: BookListItem[];
  meta: BooksListMeta;
};

export const BOOK_SORT_BY = ['title', 'price', 'createdAt', 'author'] as const;
export type BookSortBy = (typeof BOOK_SORT_BY)[number];

export const BOOK_SORT_ORDER = ['asc', 'desc'] as const;
export type BookSortOrder = (typeof BOOK_SORT_ORDER)[number];

export type ListBooksParams = {
  page?: number;
  limit?: number;
  search?: string;
  genreId?: string;
  publisherId?: string;
  authorId?: string;
  available?: boolean;
  sortBy?: BookSortBy;
  sortOrder?: BookSortOrder;
};

function appendIfDefined(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined,
): void {
  if (value === undefined) {
    return;
  }
  searchParams.set(key, String(value));
}

export function buildBooksQueryString(params: ListBooksParams): string {
  const searchParams = new URLSearchParams();

  appendIfDefined(searchParams, 'page', params.page);
  appendIfDefined(searchParams, 'limit', params.limit);
  appendIfDefined(searchParams, 'search', params.search);
  appendIfDefined(searchParams, 'genreId', params.genreId);
  appendIfDefined(searchParams, 'publisherId', params.publisherId);
  appendIfDefined(searchParams, 'authorId', params.authorId);
  appendIfDefined(searchParams, 'available', params.available);
  appendIfDefined(searchParams, 'sortBy', params.sortBy);
  appendIfDefined(searchParams, 'sortOrder', params.sortOrder);

  const qs = searchParams.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

export async function listBooks(
  params: ListBooksParams = {},
): Promise<BooksListResponse> {
  return http.get<BooksListResponse>(
    `/books${buildBooksQueryString(params)}`,
  );
}

export async function getBook(id: string): Promise<BookResponse> {
  return http.get<BookResponse>(`/books/${id}`);
}

export async function createBook(
  payload: CreateBookPayload,
): Promise<BookResponse> {
  return http.post<BookResponse>('/books', payload);
}

export async function updateBook(
  id: string,
  payload: UpdateBookPayload,
): Promise<BookResponse> {
  return http.patch<BookResponse>(`/books/${id}`, payload);
}

export async function uploadBookImage(
  id: string,
  file: File,
): Promise<BookResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return http.post<BookResponse>(`/books/${id}/image`, formData);
}

/**
 * El backend expone `imageUrl` relativo al host (`/uploads/...`), fuera del prefijo `/api`.
 */
export function resolveBookImageSrc(
  imageUrl: string | null | undefined,
): string | null {
  if (imageUrl == null || imageUrl.length === 0) {
    return null;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const apiBase = getApiBaseUrl().replace(/\/$/, '');
  const origin = apiBase.replace(/\/api$/i, '');
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${origin}${path}`;
}
