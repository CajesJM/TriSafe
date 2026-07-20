import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/announcement.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async dashboard() {
    const [drivers, verifiedDrivers, activeRides, openIncidents] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { verification: 'VERIFIED' } }),
      this.prisma.ride.count({ where: { status: 'ACTIVE' } }),
      this.prisma.incident.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
    ]);
    return { drivers, verifiedDrivers, activeRides, openIncidents, generatedAt: new Date().toISOString() };
  }

  async createAnnouncement(actorId: string, dto: CreateAnnouncementDto) {
    const drivers = await this.prisma.driver.findMany({ where: { verification: 'VERIFIED' }, select: { id: true } });
    const announcement = await this.prisma.announcement.create({ data: { title: dto.title, body: dto.body, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, recipients: { create: drivers.map(({ id }) => ({ driverId: id })) } }, include: { recipients: true } });
    await this.audit.record({ actorId, action: 'ANNOUNCEMENT_PUBLISHED', entityType: 'Announcement', entityId: announcement.id, details: { title: dto.title, recipientCount: drivers.length } });
    return announcement;
  }

  auditLogs(limit?: number) { return this.audit.list(limit); }
}
