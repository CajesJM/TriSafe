import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DraftIncidentDto, ReviewIncidentDto } from './dto/incident.dto';
import { IncidentAiService } from './incident-ai.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService, private readonly ai: IncidentAiService, private readonly audit: AuditService) {}

  async createDraft(passengerId: string, dto: DraftIncidentDto) {
    if (dto.rideId) {
      const ride = await this.prisma.ride.findFirst({ where: { id: dto.rideId, passengerId } });
      if (!ride) throw new NotFoundException('Ride not found for this passenger');
    }
    const suggestion = this.ai.draft(dto.rawDescription);
    return this.prisma.incident.create({ data: { passengerId, rideId: dto.rideId, rawDescription: dto.rawDescription, aiDraft: suggestion.draft, category: suggestion.category }, select: { id: true, rawDescription: true, aiDraft: true, category: true, status: true, createdAt: true } }).then((incident) => ({ ...incident, missingInformation: suggestion.missingInformation, aiNotice: 'AI only assists with drafting and categorization. The LGU makes all review decisions.' }));
  }

  async submit(passengerId: string, id: string) {
    const incident = await this.prisma.incident.findFirst({ where: { id, passengerId } });
    if (!incident) throw new NotFoundException('Incident not found');
    if (incident.status !== IncidentStatus.DRAFT) throw new ForbiddenException('Only draft incidents can be submitted');
    return this.prisma.incident.update({ where: { id }, data: { status: IncidentStatus.SUBMITTED, submittedAt: new Date() } });
  }

  listForPassenger(passengerId: string) { return this.prisma.incident.findMany({ where: { passengerId }, orderBy: { createdAt: 'desc' } }); }
  listForLgu() { return this.prisma.incident.findMany({ where: { status: { in: [IncidentStatus.SUBMITTED, IncidentStatus.UNDER_REVIEW, IncidentStatus.RESOLVED, IncidentStatus.DISMISSED] } }, include: { passenger: true, ride: { include: { vehicle: { include: { driver: { include: { user: true } } } } } } }, orderBy: { createdAt: 'desc' } }); }

  async review(actorId: string, id: string, dto: ReviewIncidentDto) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    const reviewed = await this.prisma.incident.update({ where: { id }, data: { status: dto.status, category: dto.category, reviewerNotes: dto.reviewerNotes } });
    await this.audit.record({ actorId, action: 'INCIDENT_REVIEWED', entityType: 'Incident', entityId: id, details: { status: dto.status, category: dto.category } });
    return reviewed;
  }
}
