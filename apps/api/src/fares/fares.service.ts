import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { calculateDistanceFare, calculateFare, PassengerFareType } from "@trisafe/contracts";
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
      dto.passengerType,
    );
    return {
      ...estimate,
      routeDurationSeconds: route.durationSeconds,
      routeCoordinates: route.coordinates,
      distanceBasis: "ROAD_ROUTE",
    };
  }

  async estimateRouteDuration(dto: Pick<
    DistanceFareEstimateDto,
    | 'originLatitude'
    | 'originLongitude'
    | 'destinationLatitude'
    | 'destinationLongitude'
  >) {
    return (await this.findRoadRoute(dto)).durationSeconds;
  }

  async reverseGeocode(dto: { latitude: number; longitude: number }) {
    // Round to roughly 11 metres before caching: close map taps should reuse a
    // result instead of repeatedly requesting the public geocoder.
    // Version the cache key so improved address formatting is immediately
    // applied instead of serving an older municipality-less label.
    const cacheKey = `v6:${dto.latitude.toFixed(4)},${dto.longitude.toFixed(4)}`;
    const cached = this.reverseGeocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    // Administrative names must come from an area containing the coordinate,
    // not from the nearest mapped road or place. The boundary layer is based
    // on Philippine barangay polygons and returns the exact three fields used
    // by the passenger UI.
    const boundaryLocation = await this.findBarangayBoundary(dto);
    if (boundaryLocation) {
      this.reverseGeocodeCache.set(cacheKey, {
        value: boundaryLocation,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      return boundaryLocation;
    }

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
      // `village`. Keep only its proper name in the passenger-facing address.
      const barangay = (address.barangay ?? address.village)
          ?.trim()
          .replace(/^Barangay\s+/i, '');
      const province = 'Bohol';
      const primaryName =
        localName?.trim() ||
        result.display_name?.split(',')[0]?.trim() ||
        fallback.name;
      const displayParts = (result.display_name ?? '')
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
      const normalizedProvince = province.toLowerCase();
      const boholIndex = displayParts.findIndex(
        (part) => part.toLowerCase() === normalizedProvince,
      );
      // Use a structured municipality first. If it is missing, the segment
      // immediately before Bohol in Nominatim's hierarchy is the municipality
      // (for example: Kauswagan, Trinidad, Bohol).
      const rawMunicipality = [
        address.municipality,
        address.town,
        address.city,
      ].find(
        (part) =>
          part?.trim() && part.trim().toLowerCase() !== normalizedProvince,
      ) ?? (boholIndex > 0 ? displayParts[boholIndex - 1] : undefined);
      const municipality = rawMunicipality
          ?.trim()
          .replace(/^(Municipality(?: of)?|City of)\s+/i, '');
      // The modal contract is intentionally strict: Barangay, Municipality,
      // Province. Never append roads, puroks, regions, postcodes, or country.
      const context = [barangay, municipality, province]
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

  private async findBarangayBoundary(dto: {
    latitude: number;
    longitude: number;
  }): Promise<{ name: string; context: string } | undefined> {
    try {
      const layerUrl = this.config.get<string>(
        "BARANGAY_BOUNDARY_LAYER_URL",
        "https://services7.arcgis.com/poQdgvLD6DHnbpsT/ArcGIS/rest/services/Philippine_Administrative_Boundaries/FeatureServer/3",
      );
      const url = new URL(`${layerUrl.replace(/\/$/, "")}/query`);
      url.searchParams.set("f", "json");
      url.searchParams.set(
        "geometry",
        `${dto.longitude},${dto.latitude}`,
      );
      url.searchParams.set("geometryType", "esriGeometryPoint");
      url.searchParams.set("inSR", "4326");
      url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      url.searchParams.set("outFields", "BRGY_NAME,CITYMUN,PROVINCE");
      url.searchParams.set("returnGeometry", "false");

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8_000),
        headers: { "user-agent": "TriSafe/0.1 (LGU transport safety system)" },
      });
      if (!response.ok) {
        throw new Error(`barangay boundary service returned ${response.status}`);
      }
      const payload = (await response.json()) as {
        error?: { message?: string };
        features?: Array<{
          attributes?: {
            BRGY_NAME?: string;
            CITYMUN?: string;
            PROVINCE?: string;
          };
        }>;
      };
      if (payload.error) {
        throw new Error(payload.error.message ?? "barangay boundary query failed");
      }
      const attributes = payload.features?.[0]?.attributes;
      const barangay = attributes?.BRGY_NAME?.trim();
      const municipality = attributes?.CITYMUN?.trim();
      const province = attributes?.PROVINCE?.trim();
      if (
        !barangay ||
        !municipality ||
        province?.toLowerCase() !== "bohol"
      ) {
        return undefined;
      }
      const context = `${barangay}, ${municipality}, Bohol`;
      return { name: barangay, context };
    } catch (error) {
      this.logger.warn(
        `Barangay boundary lookup failed; using reverse-geocoder fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  private async findRoadRoute(dto: Pick<
    DistanceFareEstimateDto,
    | 'originLatitude'
    | 'originLongitude'
    | 'destinationLatitude'
    | 'destinationLongitude'
  >) {
    const apiKey = this.config.get<string>("GOOGLE_ROUTES_API_KEY");
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Google route calculation is not configured yet",
      );
    }

    let response: Response;
    try {
      response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
          "x-goog-fieldmask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: dto.originLatitude, longitude: dto.originLongitude } } },
          destination: { location: { latLng: { latitude: dto.destinationLatitude, longitude: dto.destinationLongitude } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          polylineQuality: "HIGH_QUALITY",
          polylineEncoding: "ENCODED_POLYLINE",
          units: "METRIC",
        }),
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
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
        polyline?: { encodedPolyline?: string };
      }>;
    };
    const route = payload.routes?.[0];
    if (
      !route?.distanceMeters ||
      !route.polyline?.encodedPolyline
    ) {
      throw new BadRequestException(
        "No drivable road route was found for the selected destination",
      );
    }
    if (route.distanceMeters > 200000) {
      throw new BadRequestException(
        "The selected destination is outside the supported 200 km fare-estimate range",
      );
    }
    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: this.parseGoogleDuration(route.duration),
      coordinates: this.decodeGooglePolyline(route.polyline.encodedPolyline),
    };
  }

  private parseGoogleDuration(duration?: string) {
    const seconds = Number.parseFloat(duration?.replace(/s$/, "") ?? "0");
    return Number.isFinite(seconds) ? seconds : 0;
  }

  private decodeGooglePolyline(encoded: string) {
    const coordinates: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let latitude = 0;
    let longitude = 0;
    while (index < encoded.length) {
      const decodeValue = () => {
        let result = 0;
        let shift = 0;
        let byte: number;
        do {
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20 && index < encoded.length);
        return (result & 1) === 1 ? ~(result >> 1) : result >> 1;
      };
      latitude += decodeValue();
      longitude += decodeValue();
      coordinates.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
    }
    return coordinates;
  }

  async calculateForVehicle(
    vehicleType: string,
    distanceMeters: number,
    passengerType: PassengerFareType = 'REGULAR',
  ) {
    const normalizedType = this.normalizeVehicleType(vehicleType);
    const policy = await this.findActiveVehiclePolicy(normalizedType);
    const discountPercent = passengerType === 'STUDENT'
      ? Number(policy.studentDiscountPercent)
      : passengerType === 'SENIOR_CITIZEN'
        ? Number(policy.seniorDiscountPercent)
        : 0;
    const estimate = calculateDistanceFare({
      baseFare: Number(policy.baseFare),
      distanceMeters,
      ratePerKm: Number(policy.ratePerKm),
      minimumFare: Number(policy.minimumFare),
      passengerType,
      discountPercent,
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
        studentDiscountPercent: dto.studentDiscountPercent,
        seniorDiscountPercent: dto.seniorDiscountPercent,
        version: dto.version,
        active: dto.active ?? true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
      update: {
        baseFare: dto.baseFare,
        ratePerKm: dto.ratePerKm,
        minimumFare: dto.minimumFare,
        studentDiscountPercent: dto.studentDiscountPercent,
        seniorDiscountPercent: dto.seniorDiscountPercent,
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
        studentDiscountPercent: dto.studentDiscountPercent,
        seniorDiscountPercent: dto.seniorDiscountPercent,
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
