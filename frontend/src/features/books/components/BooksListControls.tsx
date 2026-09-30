import type { LookupItem } from '../api/lookups.api';
import type { BookSortBy, BookSortOrder } from '../api/books.api';
import { BOOK_SORT_BY } from '../api/books.api';

export type BooksListFiltersState = {
  searchInput: string;
  genreId: string;
  publisherId: string;
  authorId: string;
  available: '' | 'true' | 'false';
  sortBy: BookSortBy;
  sortOrder: BookSortOrder;
};

type BooksListControlsProps = {
  filters: BooksListFiltersState;
  authors: LookupItem[];
  publishers: LookupItem[];
  genres: LookupItem[];
  onSearchChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onPublisherChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onAvailableChange: (value: '' | 'true' | 'false') => void;
  onSortByChange: (value: BookSortBy) => void;
  onSortOrderChange: (value: BookSortOrder) => void;
};

const SORT_BY_LABELS: Record<BookSortBy, string> = {
  title: 'Título',
  price: 'Precio',
  createdAt: 'Fecha de alta',
  author: 'Autor',
};

export function BooksListControls({
  filters,
  authors,
  publishers,
  genres,
  onSearchChange,
  onGenreChange,
  onPublisherChange,
  onAuthorChange,
  onAvailableChange,
  onSortByChange,
  onSortOrderChange,
}: BooksListControlsProps) {
  return (
    <section aria-label="Filtros y ordenamiento" data-testid="books-filters">
      <div>
        <label htmlFor="books-search">Buscar por título</label>
        <input
          id="books-search"
          type="search"
          value={filters.searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Escribe para buscar…"
          data-testid="books-search"
        />
      </div>

      <div>
        <label htmlFor="books-filter-genre">Género</label>
        <select
          id="books-filter-genre"
          value={filters.genreId}
          onChange={(event) => onGenreChange(event.target.value)}
          data-testid="books-filter-genre"
        >
          <option value="">Todos</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="books-filter-publisher">Editorial</label>
        <select
          id="books-filter-publisher"
          value={filters.publisherId}
          onChange={(event) => onPublisherChange(event.target.value)}
          data-testid="books-filter-publisher"
        >
          <option value="">Todas</option>
          {publishers.map((publisher) => (
            <option key={publisher.id} value={publisher.id}>
              {publisher.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="books-filter-author">Autor</label>
        <select
          id="books-filter-author"
          value={filters.authorId}
          onChange={(event) => onAuthorChange(event.target.value)}
          data-testid="books-filter-author"
        >
          <option value="">Todos</option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="books-filter-available">Disponibilidad</label>
        <select
          id="books-filter-available"
          value={filters.available}
          onChange={(event) =>
            onAvailableChange(event.target.value as '' | 'true' | 'false')
          }
          data-testid="books-filter-available"
        >
          <option value="">Todas</option>
          <option value="true">Disponible</option>
          <option value="false">No disponible</option>
        </select>
      </div>

      <div>
        <label htmlFor="books-sort-by">Ordenar por</label>
        <select
          id="books-sort-by"
          value={filters.sortBy}
          onChange={(event) =>
            onSortByChange(event.target.value as BookSortBy)
          }
          data-testid="books-sort-by"
        >
          {BOOK_SORT_BY.map((field) => (
            <option key={field} value={field}>
              {SORT_BY_LABELS[field]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="books-sort-order">Dirección</label>
        <select
          id="books-sort-order"
          value={filters.sortOrder}
          onChange={(event) =>
            onSortOrderChange(event.target.value as BookSortOrder)
          }
          data-testid="books-sort-order"
        >
          <option value="asc">Ascendente</option>
          <option value="desc">Descendente</option>
        </select>
      </div>
    </section>
  );
}
