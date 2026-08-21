import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveTrustedContactDto } from './dto/trusted-contact.dto';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  contacts() { return this.prisma.emergencyContact.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }
  trustedContacts(passengerId: string) { return this.prisma.trustedContact.findMany({ where: { passengerId }, orderBy: [{ active: 'desc' }, { fullName: 'asc' }] }); }
  async createTrustedContact(passengerId: string, dto: SaveTrustedContactDto) {
    const count = await this.prisma.trustedContact.count({ where: { passengerId } });
    if (count >= 5) throw new ConflictException('You can save up to five trusted contacts.');
    try { return await this.prisma.trustedContact.create({ data: { passengerId, fullName: dto.fullName.trim(), relationship: dto.relationship.trim(), phone: dto.phone, active: dto.active ?? true } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('That phone number is already saved as a trusted contact.'); throw error; }
  }
  async updateTrustedContact(passengerId: string, id: string, dto: SaveTrustedContactDto) {
    const current = await this.prisma.trustedContact.findFirst({ where: { id, passengerId } });
    if (!current) throw new NotFoundException('Trusted contact not found.');
    try { return await this.prisma.trustedContact.update({ where: { id }, data: { fullName: dto.fullName.trim(), relationship: dto.relationship.trim(), phone: dto.phone, active: dto.active ?? current.active } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('That phone number is already saved as a trusted contact.'); throw error; }
  }
  async deleteTrustedContact(passengerId: string, id: string) { const result = await this.prisma.trustedContact.deleteMany({ where: { id, passengerId } }); if (!result.count) throw new NotFoundException('Trusted contact not found.'); return { deleted: true }; }
}
