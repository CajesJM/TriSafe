import { Injectable, NotFoundException } from '@nestjs/common';
import { calculateDistanceFare, calculateFare } from '@trisafe/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFareRuleDto } from './dto/create-fare-rule.dto';
import { FareEstimateDto } from './dto/fare-estimate.dto';
import { AuditService } from '../audit/audit.service';
import {
  DistanceFareEstimateDto,
  SaveVehicleFarePolicyDto,
} from './dto/vehicle-fare-policy.dto';

@Injectable()
export class FaresService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async estimate(dto: FareEstimateDto) {
    const rule = await this.findActiveRule(dto.fromLocationId, dto.toLocationId);
    const estimate = calculateFare({ baseFare: Number(rule.baseFare), distanceKm: Number(rule.distanceKm), perKm: Number(rule.perKm), passengerCount: dto.passengerCount, passengerSurcharge: Number(rule.passengerSurcharge), minimumFare: Number(rule.minimumFare) });
    return { ...estimate, matrixVersion: rule.version, fromLocationId: rule.fromLocationId, toLocationId: rule.toLocationId };
  }

  normalizeVehicleType(value: string) {
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (normalized === 'HABALHABAL') return 'HABAL_HABAL';
    return normalized;
  }

  async estimateDistance(dto: DistanceFareEstimateDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return this.calculateForVehicle(
      vehicle.vehicleType,
      dto.distanceMeters,
      dto.passengerCount,
    );
  }

  async calculateForVehicle(
    vehicleType: string,
    distanceMeters: number,
    passengerCount = 1,
  ) {
    const normalizedType = this.normalizeVehicleType(vehicleType);
    const policy = await this.findActiveVehiclePolicy(normalizedType);
    const estimate = calculateDistanceFare({
      baseFare: Number(policy.baseFare),
      distanceMeters,
      ratePerKm: Number(policy.ratePerKm),
      passengerCount,
      passengerSurcharge: Number(policy.passengerSurcharge),
      minimumFare: Number(policy.minimumFare),
    });
    return {
      ...estimate,
      matrixVersion: policy.version,
      vehicleType: normalizedType,
      policyId: policy.id,
    };
  }

  async findActiveVehiclePolicy(vehicleType: string) {
    const now = new Date();
    const policy = await this.prisma.vehicleFarePolicy.findFirst({
      where: {
        vehicleType: this.normalizeVehicleType(vehicleType),
        active: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!policy) {
      throw new NotFoundException(
        `No active LGU distance rate exists for ${this.normalizeVehicleType(vehicleType)}`,
      );
    }
    return policy;
  }

  listVehiclePolicies() {
    return this.prisma.vehicleFarePolicy.findMany({
      orderBy: [{ vehicleType: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  async saveVehiclePolicy(actorId: string, dto: SaveVehicleFarePolicyDto) {
    const vehicleType = this.normalizeVehicleType(dto.vehicleType);
    const policy = await this.prisma.vehicleFarePolicy.upsert({
      where: { vehicleType },
      create: {
        vehicleType,
        baseFare: dto.baseFare,
        ratePerKm: dto.ratePerKm,
        minimumFare: dto.minimumFare,
        passengerSurcharge: dto.passengerSurcharge,
        version: dto.version,
        active: dto.active ?? true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
      update: {
        baseFare: dto.baseFare,
        ratePerKm: dto.ratePerKm,
        minimumFare: dto.minimumFare,
        passengerSurcharge: dto.passengerSurcharge,
        version: dto.version,
        active: dto.active ?? true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });
    await this.audit.record({
      actorId,
      action: 'VEHICLE_FARE_POLICY_SAVED',
      entityType: 'VehicleFarePolicy',
      entityId: policy.id,
      details: {
        vehicleType,
        ratePerKm: dto.ratePerKm,
        version: dto.version,
      },
    });
    return policy;
  }

  async findActiveRule(fromLocationId: string, toLocationId: string) {
    const rule = await this.prisma.fareRule.findFirst({ where: { fromLocationId, toLocationId, active: true, effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }, orderBy: { effectiveFrom: 'desc' } });
    if (!rule) throw new NotFoundException('No active LGU fare rule exists for this route');
    return rule;
  }

  async createRule(actorId: string, dto: CreateFareRuleDto) {
    const rule = await this.prisma.fareRule.create({ data: { fromLocationId: dto.fromLocationId, toLocationId: dto.toLocationId, baseFare: dto.baseFare, distanceKm: dto.distanceKm, perKm: dto.perKm, passengerSurcharge: dto.passengerSurcharge, minimumFare: dto.minimumFare, version: dto.version, effectiveFrom: new Date(dto.effectiveFrom), effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined } });
    await this.audit.record({ actorId, action: 'FARE_RULE_CREATED', entityType: 'FareRule', entityId: rule.id, details: { fromLocationId: dto.fromLocationId, toLocationId: dto.toLocationId, version: dto.version } });
    return rule;
  }

  async updateRule(actorId: string, id: string, dto: CreateFareRuleDto) {
    const existing = await this.prisma.fareRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fare rule not found');
    const rule = await this.prisma.fareRule.update({ where: { id }, data: { fromLocationId: dto.fromLocationId, toLocationId: dto.toLocationId, baseFare: dto.baseFare, distanceKm: dto.distanceKm, perKm: dto.perKm, passengerSurcharge: dto.passengerSurcharge, minimumFare: dto.minimumFare, version: dto.version, effectiveFrom: new Date(dto.effectiveFrom), effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null } });
    await this.audit.record({ actorId, action: 'FARE_RULE_UPDATED', entityType: 'FareRule', entityId: id, details: { fromLocationId: dto.fromLocationId, toLocationId: dto.toLocationId, version: dto.version } });
    return rule;
  }

  async deactivateRule(actorId: string, id: string) {
    const existing = await this.prisma.fareRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fare rule not found');
    const rule = await this.prisma.fareRule.update({ where: { id }, data: { active: false, effectiveTo: existing.effectiveTo ?? new Date() } });
    await this.audit.record({ actorId, action: 'FARE_RULE_DEACTIVATED', entityType: 'FareRule', entityId: id });
    return rule;
  }

  async activateRule(actorId: string, id: string) {
    const existing = await this.prisma.fareRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fare rule not found');
    const rule = await this.prisma.fareRule.update({ where: { id }, data: { active: true, effectiveTo: null } });
    await this.audit.record({ actorId, action: 'FARE_RULE_ACTIVATED', entityType: 'FareRule', entityId: id });
    return rule;
  }

  listLocations() { return this.prisma.location.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }
  listRules() { return this.prisma.fareRule.findMany({ include: { fromLocation: true, toLocation: true }, orderBy: { effectiveFrom: 'desc' } }); }
}
