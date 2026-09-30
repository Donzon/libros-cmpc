import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogCreate: jest.Mock;
  let rootAuditLogCreate: jest.Mock;

  beforeEach(() => {
    service = new AuditService();
    auditLogCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });
    rootAuditLogCreate = jest.fn();
  });

  it('usa tx.auditLog.create y no el Prisma root', async () => {
    const tx = {
      auditLog: { create: auditLogCreate },
    };
    const prismaRoot = {
      auditLog: { create: rootAuditLogCreate },
    };

    await service.log(tx as never, {
      userId: '11111111-1111-1111-1111-111111111111',
      action: AuditAction.CREATE,
      entity: 'Book',
      entityId: 'd4444444-4444-4444-8444-444444444444',
      metadata: { title: 'Test' },
    });

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: {
        userId: '11111111-1111-1111-1111-111111111111',
        action: AuditAction.CREATE,
        entity: 'Book',
        entityId: 'd4444444-4444-4444-8444-444444444444',
        metadata: { title: 'Test' },
      },
    });
    expect(rootAuditLogCreate).not.toHaveBeenCalled();
    void prismaRoot;
  });

  it('omite metadata cuando no se envía', async () => {
    const tx = {
      auditLog: { create: auditLogCreate },
    };

    await service.log(tx as never, {
      userId: '11111111-1111-1111-1111-111111111111',
      action: AuditAction.DELETE,
      entity: 'Book',
      entityId: 'd4444444-4444-4444-8444-444444444444',
    });

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: {
        userId: '11111111-1111-1111-1111-111111111111',
        action: AuditAction.DELETE,
        entity: 'Book',
        entityId: 'd4444444-4444-4444-8444-444444444444',
      },
    });
  });
});
