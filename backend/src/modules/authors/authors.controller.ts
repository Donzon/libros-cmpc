import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { LookupItemDto } from '../../common/dto/lookup-item.dto';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { AuthorsService, LookupItem } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Crea un autor o reutiliza uno existente si el nombre ya está (sin distinguir mayúsculas)',
  })
  @ApiCreatedResponse({ type: LookupItemDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  create(
    @Body() dto: CreateAuthorDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LookupItem> {
    return this.authorsService.create(dto, user.userId);
  }
}
