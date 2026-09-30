import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const BOOK_SORT_BY = ['title', 'price', 'createdAt', 'author'] as const;
export type BookSortBy = (typeof BOOK_SORT_BY)[number];

export const BOOK_SORT_ORDER = ['asc', 'desc'] as const;
export type BookSortOrder = (typeof BOOK_SORT_ORDER)[number];

function toOptionalBoolean({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return value;
}

function toPositiveInt(defaultValue: number) {
  return ({ value }: { value: unknown }): number => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    return Number(value);
  };
}

export class ListBooksQueryDto {
  @IsOptional()
  @Transform(toPositiveInt(1))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(toPositiveInt(20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  genreId?: string;

  @IsOptional()
  @IsUUID()
  publisherId?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsIn(BOOK_SORT_BY)
  sortBy: BookSortBy = 'title';

  @IsOptional()
  @IsIn(BOOK_SORT_ORDER)
  sortOrder: BookSortOrder = 'asc';
}
