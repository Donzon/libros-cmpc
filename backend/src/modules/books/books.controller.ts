import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BooksService, BooksListResponse } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookResponse } from './mappers/book.mapper';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBookDto): Promise<BookResponse> {
    return this.booksService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListBooksQueryDto): Promise<BooksListResponse> {
    return this.booksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BookResponse> {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
  ): Promise<BookResponse> {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.booksService.remove(id);
  }
}
