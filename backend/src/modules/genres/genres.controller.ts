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
import { GenresService, LookupItem } from './genres.service';

@ApiTags('lookups')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de géneros ordenada por nombre' })
  @ApiOkResponse({ type: [LookupItemDto] })
  findAll(): Promise<LookupItem[]> {
    return this.genresService.findAll();
  }
}
