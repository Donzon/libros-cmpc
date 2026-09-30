import {
  IsBoolean,
  IsDecimal,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsDecimal({ decimal_digits: '0,2' })
  price!: string;

  @IsBoolean()
  available!: boolean;

  @IsUUID()
  authorId!: string;

  @IsUUID()
  publisherId!: string;

  @IsUUID()
  genreId!: string;
}
