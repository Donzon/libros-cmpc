import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthorDto } from './dto/create-author.dto';

export type LookupItem = {
  id: string;
  name: string;
};

const AUTHOR_ENTITY = 'Author';

const authorSelect = { id: true, name: true } as const;

@Injectable()
export class AuthorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll(): Promise<LookupItem[]> {
    return this.prisma.author.findMany({
      select: authorSelect,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Crea un autor o reutiliza uno existente (nombre case-insensitive).
   * Así el formulario puede registrar un autor nuevo sin fallar si el nombre ya está.
   */
  async create(dto: CreateAuthorDto, userId: string): Promise<LookupItem> {
    const existing = await this.findByNameInsensitive(dto.name);
    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.author.create({
          data: { name: dto.name },
          select: authorSelect,
        });

        await this.auditService.log(tx, {
          userId,
          action: AuditAction.CREATE,
          entity: AUTHOR_ENTITY,
          entityId: created.id,
        });

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.findByNameInsensitive(dto.name);
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  private findByNameInsensitive(name: string): Promise<LookupItem | null> {
    return this.prisma.author.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: authorSelect,
    });
  }
}
