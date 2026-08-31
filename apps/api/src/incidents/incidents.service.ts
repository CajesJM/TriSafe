import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DraftIncidentDto, ReviewIncidentDto, SubmitIncidentDto, UpdateIncidentDraftDto } from './dto/incident.dto';
import { IncidentAiService } from './incident-ai.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService, private readonly ai: IncidentAiService, private readonly audit: AuditService) {}

  async createDraft(passengerId: string, dto: DraftIncidentDto) {
    if (dto.rideId) {
      const ride = await this.prisma.ride.findFirst({ where: { id: dto.rideId, passengerId } });
      if (!ride) throw new NotFoundException('Ride not found for this passenger');
      const existing = await this.prisma.incident.findUnique({ where: { rideId: dto.rideId }, select: { id: true } });
      if (existing) throw new ConflictException('This ride already has an incident report.');
    }
    if (dto.evidenceData && dataImageByteLength(dto.evidenceData) > 2 * 1024 * 1024) throw new ForbiddenException('Evidence image must be 2 MB or smaller.');
    const suggestion = this.ai.draft(dto.rawDescription);
    try {
      return await this.prisma.incident.create({ data: { passengerId, rideId: dto.rideId, rawDescription: dto.rawDescription.trim(), aiDraft: suggestion.draft, category: dto.category ?? suggestion.category, evidence: dto.evidenceData ? { create: { fileName: dto.evidenceName?.trim() || 'incident-evidence.jpg', mimeType: dto.evidenceData.substring(5, dto.evidenceData.indexOf(';')), data: dto.evidenceData } } : undefined }, select: { id: true, rawDescription: true, aiDraft: true, category: true, status: true, createdAt: true, evidence: { select: { id: true, fileName: true } } } }).then((incident) => ({ ...incident, missingInformation: suggestion.missingInformation, aiNotice: 'AI only assists with drafting and categorization. The LGU makes all review decisions.' }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && dto.rideId) {
        throw new ConflictException('This ride already has an incident report.');
      }
      throw error;
    }
  }

  incidentForRide(passengerId: string, rideId: string) {
    return this.prisma.incident.findFirst({
      where: { passengerId, rideId },
      include: {
        ride: { select: { id: true, startedAt: true, fromLocationName: true, toLocationName: true, vehicle: { select: { plateNumber: true, vehicleType: true } } } },
        evidence: { select: { id: true, fileName: true } },
      },
    });
  }

  async submit(passengerId: string, id: string, dto: SubmitIncidentDto) {
    const incident = await this.prisma.incident.findFirst({ where: { id, passengerId } });
    if (!incident) throw new NotFoundException('Incident not found');
    if (incident.status !== IncidentStatus.DRAFT) throw new ForbiddenException('Only draft incidents can be submitted');
    return this.prisma.incident.update({ where: { id }, data: { status: IncidentStatus.SUBMITTED, submittedAt: new Date(), finalDescription: dto.finalDescription?.trim() || incident.aiDraft || incident.rawDescription, ...(dto.category ? { category: dto.category } : {}) }, include: { evidence: { select: { id: true, fileName: true, mimeType: true, data: true } } } });
  }

  async updateDraft(passengerId: string, id: string, dto: UpdateIncidentDraftDto) {
    const incident = await this.prisma.incident.findFirst({ where: { id, passengerId } });
    if (!incident) throw new NotFoundException('Incident not found');
    if (incident.status !== IncidentStatus.DRAFT) throw new ForbiddenException('Only draft incidents can be edited');
    if (dto.evidenceData && dataImageByteLength(dto.evidenceData) > 2 * 1024 * 1024) throw new ForbiddenException('Evidence image must be 2 MB or smaller.');
    const rawDescription = dto.rawDescription.trim();
    const suggestion = this.ai.draft(rawDescription);
    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        rawDescription,
        aiDraft: suggestion.draft,
        category: dto.category ?? incident.category,
        evidence: dto.evidenceData
          ? {
              deleteMany: {},
              create: {
                fileName: dto.evidenceName?.trim() || 'incident-evidence.jpg',
                mimeType: dto.evidenceData.substring(5, dto.evidenceData.indexOf(';')),
                data: dto.evidenceData,
              },
            }
          : dto.removeEvidence
            ? { deleteMany: {} }
            : undefined,
      },
      include: {
        ride: { select: { id: true, startedAt: true, fromLocationName: true, toLocationName: true, vehicle: { select: { plateNumber: true, vehicleType: true } } } },
        evidence: { select: { id: true, fileName: true, mimeType: true, data: true } },
      },
    });
    return {
      ...updated,
      missingInformation: suggestion.missingInformation,
      aiNotice: 'AI only assists with drafting and categorization. The LGU makes all review decisions.',
    };
  }

  listForPassenger(passengerId: string) { return this.prisma.incident.findMany({ where: { passengerId }, include: { ride: { select: { id: true, startedAt: true, fromLocationName: true, toLocationName: true, vehicle: { select: { plateNumber: true, vehicleType: true } } } }, evidence: { select: { id: true, fileName: true, mimeType: true, data: true } } }, orderBy: { createdAt: 'desc' } }); }
  listForLgu() { return this.prisma.incident.findMany({ where: { status: { in: [IncidentStatus.SUBMITTED, IncidentStatus.UNDER_REVIEW, IncidentStatus.RESOLVED, IncidentStatus.DISMISSED] } }, include: { passenger: true, ride: { include: { vehicle: { include: { driver: { include: { user: true } } } } } } }, orderBy: { createdAt: 'desc' } }); }

  async review(actorId: string, id: string, dto: ReviewIncidentDto) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    const reviewed = await this.prisma.incident.update({ where: { id }, data: { status: dto.status, category: dto.category, reviewerNotes: dto.reviewerNotes } });
    await this.audit.record({ actorId, action: 'INCIDENT_REVIEWED', entityType: 'Incident', entityId: id, details: { status: dto.status, category: dto.category } });
    return reviewed;
  }
}

function dataImageByteLength(value: string) { const base64 = value.split(',').at(-1) ?? ''; return Math.floor((base64.length * 3) / 4); }
