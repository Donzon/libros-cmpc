import { ApiProperty } from '@nestjs/swagger';

/** OpenAPI shape of the global HttpExceptionFilter payload. */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: ['title must be a string'],
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: '2026-09-29T22:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/books' })
  path!: string;
}
