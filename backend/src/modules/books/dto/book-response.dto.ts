import { ApiProperty } from '@nestjs/swagger';
import { LookupItemDto } from '../../../common/dto/lookup-item.dto';

/** OpenAPI shape of `BookResponse` (see mappers/book.mapper.ts). */
export class BookResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Cien años de soledad' })
  title!: string;

  @ApiProperty({ example: '19.99', description: 'Decimal exacto serializado como string' })
  price!: string;

  @ApiProperty({ example: true })
  available!: boolean;

  @ApiProperty({ type: String, nullable: true, example: 'books/<uuid>-1710000000000.webp' })
  imagePath!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '/uploads/books/<uuid>-1710000000000.webp' })
  imageUrl!: string | null;

  @ApiProperty({ format: 'uuid' })
  authorId!: string;

  @ApiProperty({ format: 'uuid' })
  publisherId!: string;

  @ApiProperty({ format: 'uuid' })
  genreId!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: () => LookupItemDto })
  author!: LookupItemDto;

  @ApiProperty({ type: () => LookupItemDto })
  publisher!: LookupItemDto;

  @ApiProperty({ type: () => LookupItemDto })
  genre!: LookupItemDto;
}

export class BooksListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class BooksListResponseDto {
  @ApiProperty({ type: () => [BookResponseDto] })
  data!: BookResponseDto[];

  @ApiProperty({ type: () => BooksListMetaDto })
  meta!: BooksListMetaDto;
}
