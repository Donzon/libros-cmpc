import { Book, Prisma } from '@prisma/client';

export type BookRelation = {
  id: string;
  name: string;
};

export type BookWithRelations = Book & {
  author: BookRelation;
  publisher: BookRelation;
  genre: BookRelation;
};

export type BookResponse = {
  id: string;
  title: string;
  price: string;
  available: boolean;
  imagePath: string | null;
  imageUrl: string | null;
  authorId: string;
  publisherId: string;
  genreId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: BookRelation;
  publisher: BookRelation;
  genre: BookRelation;
};

function formatPrice(price: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(price).toFixed(2);
}

export function toBookResponse(book: BookWithRelations): BookResponse {
  const imageUrl =
    book.imagePath !== null ? `/uploads/${book.imagePath}` : null;

  return {
    id: book.id,
    title: book.title,
    price: formatPrice(book.price),
    available: book.available,
    imagePath: book.imagePath,
    imageUrl,
    authorId: book.authorId,
    publisherId: book.publisherId,
    genreId: book.genreId,
    deletedAt: book.deletedAt,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    author: book.author,
    publisher: book.publisher,
    genre: book.genre,
  };
}
