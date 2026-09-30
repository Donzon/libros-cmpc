import { ApiProperty } from '@nestjs/swagger';

export class LookupItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Isabel Allende' })
  name!: string;
}
