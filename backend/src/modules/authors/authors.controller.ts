import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { LookupItemDto } from '../../common/dto/lookup-item.dto';
import { AuthorsService, LookupItem } from './authors.service';

@ApiTags('lookups')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de autores ordenada por nombre' })
  @ApiOkResponse({ type: [LookupItemDto] })
  findAll(): Promise<LookupItem[]> {
    return this.authorsService.findAll();
  }
}
