import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { BooksService, BooksListResponse } from './books.service';
import {
  BookResponseDto,
  BooksListResponseDto,
} from './dto/book-response.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookResponse } from './mappers/book.mapper';
import {
  ImageFileValidationPipe,
  ValidatedImageFile,
} from './pipes/image-file-validation.pipe';

@ApiTags('books')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear libro (JSON; la imagen va en POST /books/:id/image)' })
  @ApiCreatedResponse({ type: BookResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  create(
    @Body() dto: CreateBookDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponse> {
    return this.booksService.create(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listado paginado con filtros, orden y búsqueda por título' })
  @ApiOkResponse({ type: BooksListResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  findAll(@Query() query: ListBooksQueryDto): Promise<BooksListResponse> {
    return this.booksService.findAll(query);
  }

  @Get('export/csv')
  @SkipTransform()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="books.csv"')
  @ApiOperation({ summary: 'Exportar CSV con los mismos filtros del listado (sin paginación)' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'Columnas: título, autor, editorial, género, precio, disponibilidad',
    schema: { type: 'string', format: 'binary' },
  })
  exportCsv(
    @Query() query: ListBooksQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<string> {
    return this.booksService.exportCsv(query, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un libro' })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'No existe o está eliminado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BookResponse> {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edición parcial de un libro' })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponse> {
    return this.booksService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete (marca deletedAt)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.booksService.remove(id, user.userId);
  }

  @Post(':id/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @ApiOperation({ summary: 'Subir/reemplazar la imagen del libro (JPEG, PNG o WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Tipo (magic bytes) o tamaño inválido' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageFileValidationPipe) file: ValidatedImageFile,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponse> {
    return this.booksService.uploadImage(id, file, user.userId);
  }
}
