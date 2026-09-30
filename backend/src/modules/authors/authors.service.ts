import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type LookupItem = {
  id: string;
  name: string;
};

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<LookupItem[]> {
    return this.prisma.author.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
