import { Controller, Get } from '@nestjs/common';
import { GenresService, LookupItem } from './genres.service';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  findAll(): Promise<LookupItem[]> {
    return this.genresService.findAll();
  }
}
