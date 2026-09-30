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
import { LookupItem, PublishersService } from './publishers.service';

@ApiTags('lookups')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de editoriales ordenada por nombre' })
  @ApiOkResponse({ type: [LookupItemDto] })
  findAll(): Promise<LookupItem[]> {
    return this.publishersService.findAll();
  }
}
