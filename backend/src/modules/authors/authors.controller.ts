import { Controller, Get } from '@nestjs/common';
import { AuthorsService, LookupItem } from './authors.service';

@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  findAll(): Promise<LookupItem[]> {
    return this.authorsService.findAll();
  }
}
