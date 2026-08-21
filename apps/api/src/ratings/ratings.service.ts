import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRatingDto, ModerateRatingDto } from './dto/rating.dto';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(passengerId: string, dto: CreateRatingDto) {
    const ride = await this.prisma.ride.findUnique({ where: { id: dto.rideId }, include: { vehicle: { include: { driver: true } } } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.passengerId !== passengerId) throw new ForbiddenException('You can only rate your own completed ride');
    if (ride.status !== 'COMPLETED') throw new ForbiddenException('Only completed rides can be rated');
    const existing = await this.prisma.driverRating.findUnique({ where: { rideId: ride.id } });
    if (existing) throw new ConflictException('This ride already has a driver rating');
    const rating = await this.prisma.driverRating.create({ data: { rideId: ride.id, driverId: ride.vehicle.driver.id, passengerId, score: dto.score, comment: dto.comment?.trim() || null } });
    await this.audit.record({ actorId: passengerId, action: 'DRIVER_RATING_SUBMITTED', entityType: 'DriverRating', entityId: rating.id, details: { rideId: ride.id, driverId: rating.driverId, score: rating.score } });
    return rating;
  }

  mine(passengerId: string) { return this.prisma.driverRating.findMany({ where: { passengerId }, include: { ride: { include: { vehicle: { select: { plateNumber: true, vehicleType: true, driver: { include: { user: { select: { fullName: true } } } } } } } } }, orderBy: { createdAt: 'desc' } }); }

  async driverStatistics(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const ratings = await this.prisma.driverRating.findMany({
      where: { driverId: driver.id, visible: true },
      select: { id: true, score: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const totalReviews = ratings.length;
    const average = totalReviews
      ? Number((ratings.reduce((sum, rating) => sum + rating.score, 0) / totalReviews).toFixed(2))
      : null;
    const distribution = [5, 4, 3, 2, 1].map((score) => ({
      score,
      count: ratings.filter((rating) => rating.score === score).length,
    }));

    return {
      average,
      totalReviews,
      distribution,
      reviews: ratings.map(({ id, score, comment, createdAt }) => ({
        id,
        score,
        comment,
        createdAt,
      })),
    };
  }

  async summaries() {
    const [drivers, ratings] = await Promise.all([
      this.prisma.driver.findMany({ include: { user: { select: { fullName: true, username: true } }, vehicles: { take: 1, select: { plateNumber: true, vehicleType: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.driverRating.findMany({ where: { visible: true }, select: { driverId: true, score: true } }),
    ]);
    return drivers.map((driver) => {
      const entries = ratings.filter((rating) => rating.driverId === driver.id);
      const average = entries.length ? Number((entries.reduce((sum, rating) => sum + rating.score, 0) / entries.length).toFixed(2)) : null;
      return { driverId: driver.id, fullName: driver.user.fullName, username: driver.user.username, vehicle: driver.vehicles[0] ?? null, average, ratingCount: entries.length };
    });
  }

  all() { return this.prisma.driverRating.findMany({ include: { driver: { include: { user: { select: { fullName: true } }, vehicles: { take: 1, select: { plateNumber: true, vehicleType: true } } } }, passenger: { select: { fullName: true } }, ride: { select: { startedAt: true, fromLocationName: true, toLocationName: true } } }, orderBy: { createdAt: 'desc' }, take: 300 }); }

  async moderate(actorId: string, id: string, dto: ModerateRatingDto) {
    const current = await this.prisma.driverRating.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Rating record not found');
    if (current.visible === dto.visible && (dto.moderationNotes?.trim() || null) === current.moderationNotes) return current;
    if (!dto.visible && !dto.moderationNotes?.trim()) throw new ForbiddenException('Enter an administrative reason before hiding a rating');
    const rating = await this.prisma.driverRating.update({ where: { id }, data: { visible: dto.visible, moderationNotes: dto.moderationNotes?.trim() || null } });
    await this.audit.record({ actorId, action: 'DRIVER_RATING_MODERATED', entityType: 'DriverRating', entityId: id, details: { previousVisible: current.visible, visible: rating.visible } });
    return rating;
  }
}
