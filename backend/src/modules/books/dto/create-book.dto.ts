import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDecimal,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: 'Cien años de soledad', minLength: 1 })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: '19.99', description: 'Decimal con hasta 2 decimales, como string' })
  @IsDecimal({ decimal_digits: '0,2' })
  price!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  available!: boolean;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  authorId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  publisherId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  genreId!: string;
}
