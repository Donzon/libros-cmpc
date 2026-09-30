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
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { BooksService, BooksListResponse } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookResponse } from './mappers/book.mapper';
import {
  ImageFileValidationPipe,
  ValidatedImageFile,
} from './pipes/image-file-validation.pipe';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateBookDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponse> {
    return this.booksService.create(dto, user.userId);
  }

  @Get()
  findAll(@Query() query: ListBooksQueryDto): Promise<BooksListResponse> {
    return this.booksService.findAll(query);
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="books.csv"')
  exportCsv(
    @Query() query: ListBooksQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<string> {
    return this.booksService.exportCsv(query, user.userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BookResponse> {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponse> {
    return this.booksService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageFileValidationPipe) file: ValidatedImageFile,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponse> {
    return this.booksService.uploadImage(id, file, user.userId);
  }
}
