import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateRatingDto } from "./dto/rating.dto";

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(passengerId: string, dto: CreateRatingDto) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: dto.rideId },
      include: { vehicle: { include: { driver: true } } },
    });
    if (!ride) throw new NotFoundException("Ride not found");
    if (ride.passengerId !== passengerId)
      throw new ForbiddenException("You can only rate your own completed ride");
    if (ride.status !== "COMPLETED")
      throw new ForbiddenException("Only completed rides can be rated");
    const existing = await this.prisma.driverRating.findUnique({
      where: { rideId: ride.id },
    });
    if (existing)
      throw new ConflictException("This ride already has a driver rating");
    const rating = await this.prisma.driverRating.create({
      data: {
        rideId: ride.id,
        driverId: ride.vehicle.driver.id,
        passengerId,
        score: dto.score,
        comment: dto.comment?.trim() || null,
      },
    });
    await this.audit.record({
      actorId: passengerId,
      action: "DRIVER_RATING_SUBMITTED",
      entityType: "DriverRating",
      entityId: rating.id,
      details: {
        rideId: ride.id,
        driverId: rating.driverId,
        score: rating.score,
      },
    });
    return rating;
  }

  mine(passengerId: string) {
    return this.prisma.driverRating.findMany({
      where: { passengerId },
      include: {
        ride: {
          include: {
            vehicle: {
              select: {
                plateNumber: true,
                vehicleType: true,
                driver: { include: { user: { select: { fullName: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async driverStatistics(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Driver profile not found");

    const ratings = await this.prisma.driverRating.findMany({
      where: { driverId: driver.id },
      select: { id: true, score: true, comment: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const totalReviews = ratings.length;
    const average = totalReviews
      ? Number(
          (
            ratings.reduce((sum, rating) => sum + rating.score, 0) /
            totalReviews
          ).toFixed(2),
        )
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
      this.prisma.driver.findMany({
        include: {
          user: {
            select: { fullName: true, username: true, avatarData: true },
          },
          vehicles: {
            take: 1,
            select: {
              plateNumber: true,
              vehicleType: true,
              bodyNumber: true,
              permitNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.driverRating.findMany({
        select: { driverId: true, score: true },
      }),
    ]);
    return drivers.map((driver) => {
      const entries = ratings.filter((rating) => rating.driverId === driver.id);
      const average = entries.length
        ? Number(
            (
              entries.reduce((sum, rating) => sum + rating.score, 0) /
              entries.length
            ).toFixed(2),
          )
        : null;
      return {
        driverId: driver.id,
        createdAt: driver.createdAt,
        fullName: driver.user.fullName,
        username: driver.user.username,
        avatarData: driver.user.avatarData,
        vehicle: driver.vehicles[0] ?? null,
        average,
        ratingCount: entries.length,
      };
    });
  }

  all() {
    return this.prisma.driverRating.findMany({
      include: {
        driver: {
          include: {
            user: { select: { fullName: true, avatarData: true } },
            vehicles: {
              take: 1,
              select: {
                plateNumber: true,
                vehicleType: true,
                bodyNumber: true,
                permitNumber: true,
              },
            },
          },
        },
        passenger: {
          select: { fullName: true, username: true, avatarData: true },
        },
        ride: {
          select: {
            startedAt: true,
            fromLocationName: true,
            toLocationName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  }

  async byDriver(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Driver profile not found");

    return this.prisma.driverRating.findMany({
      where: { driverId },
      select: {
        id: true,
        score: true,
        comment: true,
        createdAt: true,
        passenger: {
          select: { fullName: true, username: true, avatarData: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async resetDriverRatings(
    actorId: string,
    driverId: string,
    confirmation: string,
  ) {
    if (confirmation !== "RESET")
      throw new BadRequestException("Type RESET to confirm rating deletion");

    return this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { id: driverId },
        select: { id: true },
      });
      if (!driver) throw new NotFoundException("Driver profile not found");

      const { count } = await tx.driverRating.deleteMany({
        where: { driverId },
      });
      if (!count)
        throw new ConflictException(
          "This driver has no rating records to reset",
        );

      await tx.auditLog.create({
        data: {
          actorId,
          action: "DRIVER_RATINGS_RESET",
          entityType: "Driver",
          entityId: driverId,
          details: { deletedCount: count },
        },
      });
      return { deletedCount: count };
    });
  }
}
