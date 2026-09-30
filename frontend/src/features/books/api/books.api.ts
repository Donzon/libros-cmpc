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

export type ListBooksParams = {
  page?: number;
  limit?: number;
};

function buildQueryString(params: ListBooksParams): string {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  const qs = searchParams.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

export async function listBooks(
  params: ListBooksParams = {},
): Promise<BooksListResponse> {
  return http.get<BooksListResponse>(`/books${buildQueryString(params)}`);
}
