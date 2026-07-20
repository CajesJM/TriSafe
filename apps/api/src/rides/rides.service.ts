import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RideStatus } from '@prisma/client';
import { FaresService } from '../fares/fares.service';
import { PrismaService } from '../prisma/prisma.service';
import { EndRideDto, StartRideDto } from './dto/start-ride.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RidesService {
  constructor(private readonly prisma: PrismaService, private readonly fares: FaresService, private readonly audit: AuditService) {}

  async preview(dto: StartRideDto) {
    const vehicle = await this.getEligibleVehicle(dto.vehicleId);
    return { vehicleId: vehicle.id, ...(await this.fares.estimate(dto)), driverName: vehicle.driver.user.fullName, plateNumber: vehicle.plateNumber };
  }

  async start(passengerId: string, dto: StartRideDto) {
    const vehicle = await this.getEligibleVehicle(dto.vehicleId);
    const fare = await this.fares.estimate(dto);
    const active = await this.prisma.ride.findFirst({ where: { passengerId, status: RideStatus.ACTIVE } });
    if (active) throw new ForbiddenException('Complete your active ride before starting another');
    const ride = await this.prisma.ride.create({ data: { passengerId, vehicleId: vehicle.id, fromLocationId: dto.fromLocationId, toLocationId: dto.toLocationId, estimatedFare: fare.amount, fareVersion: fare.matrixVersion, startLatitude: dto.startLatitude, startLongitude: dto.startLongitude }, include: { vehicle: { include: { driver: { include: { user: true } } } } } });
    await this.audit.record({ actorId: passengerId, action: 'RIDE_STARTED', entityType: 'Ride', entityId: ride.id, details: { vehicleId: dto.vehicleId, fromLocationId: dto.fromLocationId, toLocationId: dto.toLocationId } });
    return this.addLocationNames(ride);
  }

  async end(passengerId: string, id: string, dto: EndRideDto) {
    const ride = await this.ownedRide(passengerId, id);
    if (ride.status !== RideStatus.ACTIVE) throw new ForbiddenException('Ride is already closed');
    const updatedRide = await this.prisma.ride.update({ where: { id }, data: { status: RideStatus.COMPLETED, endedAt: new Date(), endLatitude: dto.endLatitude, endLongitude: dto.endLongitude } });
    await this.audit.record({ actorId: passengerId, action: 'RIDE_COMPLETED', entityType: 'Ride', entityId: id });
    return this.addLocationNames(updatedRide);
  }

  async history(passengerId: string) {
    const rides = await this.prisma.ride.findMany({ where: { passengerId }, include: { vehicle: { include: { driver: { include: { user: true } } } } }, orderBy: { startedAt: 'desc' } });
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
