import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

export type AuditLogParams = {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  async log(
    tx: Prisma.TransactionClient,
    params: AuditLogParams,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        ...(params.metadata !== undefined
          ? { metadata: params.metadata }
          : {}),
      },
    });
  }
}
