import { Controller, Get } from '@nestjs/common';
import { LookupItem, PublishersService } from './publishers.service';

@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  findAll(): Promise<LookupItem[]> {
    return this.publishersService.findAll();
  }
}
