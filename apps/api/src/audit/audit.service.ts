import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditEntry = {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(entry: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details,
      },
    });
  }

  list(limit = 100) {
    const safeLimit = Number.isFinite(limit) ? Math.trunc(limit) : 100;
    return this.prisma.auditLog.findMany({
      take: Math.min(Math.max(safeLimit, 1), 500),
      orderBy: { createdAt: 'desc' },
    }).then(async (logs) => {
      const actorIds = [...new Set(logs.map((log) => log.actorId).filter((id): id is string => Boolean(id)))];
      if (actorIds.length === 0) {
        return logs.map((log) => ({ ...log, actorName: null, actorEmail: null }));
      }
      const users = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true, email: true } });
      const usersById = new Map(users.map((user) => [user.id, user]));
      return logs.map((log) => ({
        ...log,
        actorName: log.actorId ? usersById.get(log.actorId)?.fullName ?? null : null,
        actorEmail: log.actorId ? usersById.get(log.actorId)?.email ?? null : null,
      }));
    });
  }
}
