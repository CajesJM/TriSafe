import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePresenceDto } from './dto/update-presence.dto';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  update(userId: string, dto: UpdatePresenceDto) {
    return this.prisma.livePresence.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  async listLive() {
    const freshAfter = new Date(Date.now() - 5 * 60 * 1000);
    const presences = await this.prisma.livePresence.findMany({
      where: {
        updatedAt: { gte: freshAfter },
        user: {
          status: 'ACTIVE',
          role: { in: ['PASSENGER', 'DRIVER'] },
        },
      },
      include: {
        user: {
          include: {
            driverProfile: {
              include: {
                vehicles: { where: { isActive: true }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      presences.map(async (presence) => {
        const activeRide =
          presence.user.role === 'PASSENGER'
            ? await this.prisma.ride.findFirst({
                where: { passengerId: presence.userId, status: 'ACTIVE' },
                select: {
                  id: true,
                  actualDistanceMeters: true,
                  vehicle: { select: { plateNumber: true, vehicleType: true } },
                },
              })
            : null;
        const driverVehicle = presence.user.driverProfile?.vehicles[0];
        return {
          id: presence.id,
          userId: presence.userId,
          role: presence.user.role,
          fullName: presence.user.fullName,
          latitude: Number(presence.latitude),
          longitude: Number(presence.longitude),
          accuracy: presence.accuracy,
          heading: presence.heading,
          speed: presence.speed,
          updatedAt: presence.updatedAt,
          vehicle: driverVehicle
            ? {
                plateNumber: driverVehicle.plateNumber,
                vehicleType: driverVehicle.vehicleType,
              }
            : activeRide?.vehicle ?? null,
          activeRide: activeRide
            ? {
                id: activeRide.id,
                actualDistanceMeters: activeRide.actualDistanceMeters,
              }
            : null,
        };
      }),
    );
  }
}
