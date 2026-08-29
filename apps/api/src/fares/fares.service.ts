import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { calculateDistanceFare, calculateFare } from "@trisafe/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFareRuleDto } from "./dto/create-fare-rule.dto";
import { FareEstimateDto } from "./dto/fare-estimate.dto";
import { AuditService } from "../audit/audit.service";
import {
  DistanceFareEstimateDto,
  SaveVehicleFarePolicyDto,
} from "./dto/vehicle-fare-policy.dto";

@Injectable()
export class FaresService {
  private readonly logger = new Logger(FaresService.name);
  private readonly reverseGeocodeCache = new Map<
    string,
    { expiresAt: number; value: { name: string; context: string } }
  >();
  private nextReverseGeocodeRequestAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async estimate(dto: FareEstimateDto) {
    const rule = await this.findActiveRule(
      dto.fromLocationId,
      dto.toLocationId,
    );
    const estimate = calculateFare({
      baseFare: Number(rule.baseFare),
      distanceKm: Number(rule.distanceKm),
      perKm: Number(rule.perKm),
      passengerCount: dto.passengerCount,
      passengerSurcharge: Number(rule.passengerSurcharge),
      minimumFare: Number(rule.minimumFare),
    });
    return {
      ...estimate,
      matrixVersion: rule.version,
      fromLocationId: rule.fromLocationId,
      toLocationId: rule.toLocationId,
    };
  }

  normalizeVehicleType(value: string) {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    if (normalized === "HABALHABAL") return "HABAL_HABAL";
    return normalized;
  }

  async estimateDistance(dto: DistanceFareEstimateDto) {
    const route = await this.findRoadRoute(dto);
    const estimate = await this.calculateForVehicle(
      dto.vehicleType,
      route.distanceMeters,
      dto.passengerCount,
    );
    return {
      ...estimate,
      routeDurationSeconds: route.durationSeconds,
      routeCoordinates: route.coordinates,
      distanceBasis: "ROAD_ROUTE",
    };
  }

  async reverseGeocode(dto: { latitude: number; longitude: number }) {
    // Round to roughly 11 metres before caching: close map taps should reuse a
    // result instead of repeatedly requesting the public geocoder.
    // Version the cache key so improved address formatting is immediately
    // applied instead of serving an older municipality-less label.
    const cacheKey = `v4:${dto.latitude.toFixed(4)},${dto.longitude.toFixed(4)}`;
    const cached = this.reverseGeocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    // The public Nominatim service permits low-volume reverse lookups only.
    // Serialise uncached requests to remain below one request per second.
    const waitMs = Math.max(0, this.nextReverseGeocodeRequestAt - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.nextReverseGeocodeRequestAt = Date.now() + 1100;

    const fallback = {
      name: 'Selected location',
      context: 'Bohol, Philippines',
    };
    try {
      const baseUrl = this.config.get<string>(
        'REVERSE_GEOCODING_BASE_URL',
        'https://nominatim.openstreetmap.org',
      );
      const url = new URL('/reverse', baseUrl);
      url.searchParams.set('lat', String(dto.latitude));
      url.searchParams.set('lon', String(dto.longitude));
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', 'en');
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'user-agent': 'TriSafe/0.1 (LGU transport safety system)' },
      });
      if (!response.ok) throw new Error(`reverse geocoder returned ${response.status}`);
      const result = (await response.json()) as {
        name?: string;
        display_name?: string;
        address?: Record<string, string | undefined>;
      };
      const address = result.address ?? {};
      const resultName = result.name?.trim();
      const isRoadName = Boolean(
        resultName &&
            [address.road, address.residential, address.pedestrian]
                .filter((value): value is string => Boolean(value?.trim()))
                .some((value) => value.trim().toLowerCase() === resultName.toLowerCase()),
      );
      const localName = [
        // Roads are useful supporting context, but a passenger first needs a
        // landmark, neighbourhood, or barangay as the stop label.
        isRoadName ? undefined : resultName,
        address.amenity,
        address.tourism,
        address.shop,
        address.building,
        address.neighbourhood,
        address.suburb,
        address.hamlet,
        address.village,
        address.barangay,
        address.road,
        address.municipality,
        address.town,
        address.city,
        address.city_district,
        address.county,
      ].find((value) => value?.trim());
      // Philippine OSM data may expose a barangay as either `barangay` or
      // `village`. Present both consistently to passengers as a barangay.
      const barangay = (address.barangay ?? address.village)?.trim();
      const barangayLabel = barangay ? `Barangay ${barangay}` : undefined;
      const province = address.province ?? address.state ?? 'Bohol';
      const primaryName =
        localName?.trim() ||
        result.display_name?.split(',')[0]?.trim() ||
        fallback.name;
      const displayParts = (result.display_name ?? '')
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
      const normalizedProvince = province.trim().toLowerCase();
      const isExcludedDisplayPart = (part: string) => {
        const normalized = part.toLowerCase();
        return normalized === primaryName.toLowerCase() ||
          normalized === normalizedProvince ||
          normalized === 'philippines' ||
          normalized === 'central visayas' ||
          !/\D/.test(part);
      };
      // Use the normal administrative fields first. Some Nominatim responses
      // put a Philippine municipality only in display_name, so take the last
      // useful local segment before Bohol as a fallback (e.g. Trinidad).
      const municipality = [
        address.municipality,
        address.town,
        address.city,
        address.city_district,
        address.county,
      ].find((part) => part?.trim() && part.trim().toLowerCase() !== normalizedProvince) ??
          [...displayParts].reverse().find((part) => !isExcludedDisplayPart(part));
      const context = [
        address.purok ?? address.road,
        barangayLabel,
        municipality,
        province,
      ]
          .reduce<string[]>((parts, part) => {
        const cleaned = part?.trim();
        if (cleaned && !parts.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) {
          parts.push(cleaned);
        }
        return parts;
      }, [])
          .join(', ');
      const value = {
        name: primaryName,
        context: context || fallback.context,
      };
      this.reverseGeocodeCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      return value;
    } catch (error) {
      this.logger.warn(`Reverse geocoding failed: ${error instanceof Error ? error.message : String(error)}`);
      return fallback;
    }
  }

  private async findRoadRoute(dto: DistanceFareEstimateDto) {
    const baseUrl = this.config.get<string>(
      "ROUTING_BASE_URL",
      "https://router.project-osrm.org",
    );
    const coordinates = `${dto.originLongitude},${dto.originLatitude};${dto.destinationLongitude},${dto.destinationLatitude}`;
    const url = new URL(`/route/v1/driving/${coordinates}`, baseUrl);

    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", "false");

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { "user-agent": "TriSafe/0.1 (LGU transport safety system)" },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Road routing request failed: ${reason}`);
      throw new ServiceUnavailableException(
        "The road routing service is temporarily unavailable",
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        "The road routing service could not calculate this trip",
      );
    }

    const payload = (await response.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: Array<[number, number]> };
      }>;
    };
    const route = payload.routes?.[0];
    if (
      payload.code !== "Ok" ||
      !route?.distance ||
      !route.geometry?.coordinates
    ) {
      throw new BadRequestException(
        "No drivable road route was found for the selected destination",
      );
    }
    if (route.distance > 200000) {
      throw new BadRequestException(
        "The selected destination is outside the supported 200 km fare-estimate range",
      );
    }
    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration ?? 0,
      coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      })),
    };
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
      orderBy: { effectiveFrom: "desc" },
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
      orderBy: [{ vehicleType: "asc" }, { effectiveFrom: "desc" }],
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
      action: "VEHICLE_FARE_POLICY_SAVED",
      entityType: "VehicleFarePolicy",
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
    const rule = await this.prisma.fareRule.findFirst({
      where: {
        fromLocationId,
        toLocationId,
        active: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!rule)
      throw new NotFoundException(
        "No active LGU fare rule exists for this route",
      );
    return rule;
  }

  async createRule(actorId: string, dto: CreateFareRuleDto) {
    const rule = await this.prisma.fareRule.create({
      data: {
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        baseFare: dto.baseFare,
        distanceKm: dto.distanceKm,
        perKm: dto.perKm,
        passengerSurcharge: dto.passengerSurcharge,
        minimumFare: dto.minimumFare,
        version: dto.version,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
    await this.audit.record({
      actorId,
      action: "FARE_RULE_CREATED",
      entityType: "FareRule",
      entityId: rule.id,
      details: {
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        version: dto.version,
      },
    });
    return rule;
  }

  async updateRule(actorId: string, id: string, dto: CreateFareRuleDto) {
    const existing = await this.prisma.fareRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Fare rule not found");
    const rule = await this.prisma.fareRule.update({
      where: { id },
      data: {
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        baseFare: dto.baseFare,
        distanceKm: dto.distanceKm,
        perKm: dto.perKm,
        passengerSurcharge: dto.passengerSurcharge,
        minimumFare: dto.minimumFare,
        version: dto.version,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });
    await this.audit.record({
      actorId,
      action: "FARE_RULE_UPDATED",
      entityType: "FareRule",
      entityId: id,
      details: {
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        version: dto.version,
      },
    });
    return rule;
  }

  async deactivateRule(actorId: string, id: string) {
    const existing = await this.prisma.fareRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Fare rule not found");
    const rule = await this.prisma.fareRule.update({
      where: { id },
      data: { active: false, effectiveTo: existing.effectiveTo ?? new Date() },
    });
    await this.audit.record({
      actorId,
      action: "FARE_RULE_DEACTIVATED",
      entityType: "FareRule",
      entityId: id,
    });
    return rule;
  }

  async activateRule(actorId: string, id: string) {
    const existing = await this.prisma.fareRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Fare rule not found");
    const rule = await this.prisma.fareRule.update({
      where: { id },
      data: { active: true, effectiveTo: null },
    });
    await this.audit.record({
      actorId,
      action: "FARE_RULE_ACTIVATED",
      entityType: "FareRule",
      entityId: id,
    });
    return rule;
  }

  listLocations() {
    return this.prisma.location.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }
  listRules() {
    return this.prisma.fareRule.findMany({
      include: { fromLocation: true, toLocation: true },
      orderBy: { effectiveFrom: "desc" },
    });
  }
}
