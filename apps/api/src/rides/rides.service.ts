import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RideStatus } from '@prisma/client';
import { FaresService } from '../fares/fares.service';
import { PrismaService } from '../prisma/prisma.service';
import { EndRideDto, StartRideDto } from './dto/start-ride.dto';
import { AuditService } from '../audit/audit.service';
import { RecordRideLocationDto } from './dto/record-ride-location.dto';
import { RideHistoryQueryDto } from './dto/ride-history-query.dto';

@Injectable()
export class RidesService {
  constructor(private readonly prisma: PrismaService, private readonly fares: FaresService, private readonly audit: AuditService) {}

  async preview(dto: StartRideDto) {
    const vehicle = await this.getEligibleVehicle(dto.vehicleId);
    const routeRule = await this.fares.findActiveRule(
      dto.fromLocationId,
      dto.toLocationId,
    );
    const fare = await this.fares.calculateForVehicle(
      vehicle.vehicleType,
      Number(routeRule.distanceKm) * 1000,
      dto.passengerCount,
    );
    return {
      vehicleId: vehicle.id,
      ...fare,
      driverName: vehicle.driver.user.fullName,
      plateNumber: vehicle.plateNumber,
      estimateBasis: 'PLANNED_ROUTE',
    };
  }

  async start(passengerId: string, dto: StartRideDto) {
    const vehicle = await this.getEligibleVehicle(dto.vehicleId);
    const routeRule = await this.fares.findActiveRule(
      dto.fromLocationId,
      dto.toLocationId,
    );
    const fare = await this.fares.calculateForVehicle(
      vehicle.vehicleType,
      Number(routeRule.distanceKm) * 1000,
      dto.passengerCount,
    );
    const active = await this.prisma.ride.findFirst({ where: { passengerId, status: RideStatus.ACTIVE } });
    if (active) throw new ForbiddenException('Complete your active ride before starting another');
    const vehicleType = this.fares.normalizeVehicleType(vehicle.vehicleType);
    const ride = await this.prisma.ride.create({
      data: {
        passengerId,
        vehicleId: vehicle.id,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        estimatedFare: fare.amount,
        fareVersion: fare.matrixVersion,
        passengerCount: dto.passengerCount,
        vehicleType,
        startLatitude: dto.startLatitude,
        startLongitude: dto.startLongitude,
        locationPoints:
          dto.startLatitude != null && dto.startLongitude != null
            ? {
                create: {
                  latitude: dto.startLatitude,
                  longitude: dto.startLongitude,
                },
              }
            : undefined,
      },
      include: { vehicle: { include: { driver: { include: { user: true } } } } },
    });
    if (dto.startLatitude != null && dto.startLongitude != null) {
      await this.updatePresence(passengerId, {
        latitude: dto.startLatitude,
        longitude: dto.startLongitude,
      });
    }
    await this.audit.record({ actorId: passengerId, action: 'RIDE_STARTED', entityType: 'Ride', entityId: ride.id, details: { vehicleId: dto.vehicleId, fromLocationId: dto.fromLocationId, toLocationId: dto.toLocationId } });
    return this.addLocationNames(ride);
  }

  async end(passengerId: string, id: string, dto: EndRideDto) {
    let ride = await this.ownedRide(passengerId, id);
    if (ride.status !== RideStatus.ACTIVE) throw new ForbiddenException('Ride is already closed');
    if (dto.endLatitude != null && dto.endLongitude != null) {
      await this.recordLocation(passengerId, id, {
        latitude: dto.endLatitude,
        longitude: dto.endLongitude,
      });
      ride = await this.ownedRide(passengerId, id);
    }
    const finalEstimate = await this.fares.calculateForVehicle(
      ride.vehicleType,
      ride.actualDistanceMeters,
      ride.passengerCount,
    );
    const updatedRide = await this.prisma.ride.update({
      where: { id },
      data: {
        status: RideStatus.COMPLETED,
        endedAt: new Date(),
        endLatitude: dto.endLatitude,
        endLongitude: dto.endLongitude,
        finalFare: finalEstimate.amount,
      },
      include: { vehicle: { include: { driver: { include: { user: true } } } } },
    });
    await this.audit.record({ actorId: passengerId, action: 'RIDE_COMPLETED', entityType: 'Ride', entityId: id });
    return this.addLocationNames(updatedRide);
  }

  async recordLocation(
    passengerId: string,
    id: string,
    dto: RecordRideLocationDto,
  ) {
    const ride = await this.ownedRide(passengerId, id);
    if (ride.status !== RideStatus.ACTIVE) {
      throw new ForbiddenException('Location can only be added to an active ride');
    }

    const lastPoint = await this.prisma.rideLocationPoint.findFirst({
      where: { rideId: id },
      orderBy: { recordedAt: 'desc' },
    });
    const segmentMeters = lastPoint
      ? this.haversineMeters(
          Number(lastPoint.latitude),
          Number(lastPoint.longitude),
          dto.latitude,
          dto.longitude,
        )
      : 0;
    const elapsedSeconds = lastPoint
      ? Math.max(1, (Date.now() - lastPoint.recordedAt.getTime()) / 1000)
      : 1;
    const plausible =
      segmentMeters <= 5000 &&
      segmentMeters / elapsedSeconds <= 60 &&
      (dto.accuracy == null || dto.accuracy <= 100);
    const acceptedMeters = plausible ? segmentMeters : 0;

    const [, updatedRide] = await this.prisma.$transaction([
      this.prisma.rideLocationPoint.create({
        data: {
          rideId: id,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
        },
      }),
      this.prisma.ride.update({
        where: { id },
        data: { actualDistanceMeters: { increment: acceptedMeters } },
      }),
    ]);
    await this.updatePresence(passengerId, dto);
    const currentFare = await this.fares.calculateForVehicle(
      updatedRide.vehicleType,
      updatedRide.actualDistanceMeters,
      updatedRide.passengerCount,
    );
    return {
      rideId: id,
      actualDistanceMeters: updatedRide.actualDistanceMeters,
      segmentMeters: acceptedMeters,
      pointAccepted: plausible,
      currentFare,
    };
  }

  async history(passengerId: string, query: RideHistoryQueryDto = {}) {
    const startedAt = query.from || query.to
      ? {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lt: new Date(query.to) } : {}),
        }
      : undefined;
    const rides = await this.prisma.ride.findMany({
      // The passenger ID always comes from the verified access token. It is
      // never accepted from the query string, preventing cross-account reads.
      where: { passengerId, ...(startedAt ? { startedAt } : {}) },
      include: { vehicle: { include: { driver: { include: { user: true } } } } },
      orderBy: { startedAt: 'desc' },
    });
    return Promise.all(rides.map((ride) => this.addLocationNames(ride)));
  }

  async share(passengerId: string, id: string, liveLocationUrl?: string) {
    const ride = await this.ownedRide(passengerId, id);
    const [from, to] = await Promise.all([this.prisma.location.findUnique({ where: { id: ride.fromLocationId } }), this.prisma.location.findUnique({ where: { id: ride.toLocationId } })]);
    return { rideId: ride.id, driverName: ride.vehicle.driver.user.fullName, vehiclePlateNumber: ride.vehicle.plateNumber, from: from?.name, to: to?.name, startedAt: ride.startedAt.toISOString(), liveLocationUrl };
  }

  private async getEligibleVehicle(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { driver: { include: { user: true, franchise: true } } } });
    if (!vehicle || !vehicle.isActive || vehicle.driver.verification !== 'VERIFIED' || !vehicle.driver.franchise || vehicle.driver.franchise.status !== 'VERIFIED' || vehicle.driver.franchise.expiresAt <= new Date()) throw new ForbiddenException('Vehicle is not currently eligible for rides');
    return vehicle;
  }

  private async ownedRide(passengerId: string, id: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id }, include: { vehicle: { include: { driver: { include: { user: true } } } } } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.passengerId !== passengerId) throw new ForbiddenException('Ride does not belong to this passenger');
    return ride;
  }

  private async updatePresence(
    userId: string,
    dto: Pick<
      RecordRideLocationDto,
      'latitude' | 'longitude' | 'accuracy' | 'heading' | 'speed'
    >,
  ) {
    return this.prisma.livePresence.upsert({
      where: { userId },
      create: {
        userId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        heading: dto.heading,
        speed: dto.speed,
      },
      update: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        heading: dto.heading,
        speed: dto.speed,
      },
    });
  }

  private haversineMeters(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ) {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusMeters = 6371000;
    const latitudeDelta = toRadians(latitude2 - latitude1);
    const longitudeDelta = toRadians(longitude2 - longitude1);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(latitude1)) *
        Math.cos(toRadians(latitude2)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async addLocationNames<T extends { fromLocationId: string; toLocationId: string }>(ride: T) {
    const [from, to] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: ride.fromLocationId } }),
      this.prisma.location.findUnique({ where: { id: ride.toLocationId } }),
    ]);

    return {
      ...ride,
      fromLocationName: from?.name ?? 'Unknown origin',
      toLocationName: to?.name ?? 'Unknown destination',
    };
  }
}
