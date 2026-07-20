import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  contacts() { return this.prisma.emergencyContact.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }
}
