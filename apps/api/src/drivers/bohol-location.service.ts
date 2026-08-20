import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BoholAddressDto } from './dto/bohol-address.dto';
import type { DriverPresentAddressDto } from './dto/driver-present-address.dto';

type PsgcItem = {
  code: string;
  name: string;
  type?: string;
  province?: string;
  city_municipality?: string;
};

type PhotonFeature = {
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

export type StreetSuggestion = {
  id: string;
  name: string;
  label: string;
  postalCode: string;
  latitude: number;
  longitude: number;
};

const BOHOL_CODE = '0701200000';
const BOHOL_BOUNDS = '123.68,9.45,124.72,10.27';

@Injectable()
export class BoholLocationService {
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(private readonly config: ConfigService) {}

  province() {
    return { code: BOHOL_CODE, name: 'Bohol' };
  }

  async municipalities() {
    const response = await this.psgc<{ data: PsgcItem[] }>(
      '/provinces/Bohol/cities-municipalities',
    );
    return response.data
      .map((item) => ({ code: item.code, name: item.name.trim(), type: item.type }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async barangays(municipalityCode: string) {
    const municipality = await this.requireMunicipality(municipalityCode);
    const response = await this.psgc<{ data: PsgcItem[] }>(
      `/cities-municipalities/${encodeURIComponent(municipality.code)}/barangays`,
    );
    return response.data
      .filter((item) => item.province === 'Bohol')
      .map((item) => ({ code: item.code, name: item.name.trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async streetSuggestions(
    municipalityCode: string,
    barangayCode: string,
    query: string,
  ) {
    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    if (cleanQuery.length < 2) return [];
    const hierarchy = await this.requireHierarchy(municipalityCode, barangayCode);
    return this.searchPhoton(cleanQuery, hierarchy.municipality.name, hierarchy.barangay.name);
  }

  async validateRegistrationAddress(dto: BoholAddressDto) {
    if (dto.provinceCode !== BOHOL_CODE || dto.provinceName.toLowerCase() !== 'bohol') {
      throw new BadRequestException('Driver registration currently supports Bohol addresses only.');
    }
    const hierarchy = await this.requireHierarchy(dto.municipalityCode, dto.barangayCode);
    if (
      hierarchy.municipality.name.localeCompare(dto.municipalityName, undefined, { sensitivity: 'accent' }) !== 0 ||
      hierarchy.barangay.name.localeCompare(dto.barangayName, undefined, { sensitivity: 'accent' }) !== 0
    ) {
      throw new BadRequestException('The selected municipality and barangay names do not match their PSGC codes.');
    }
    const suggestions = await this.searchPhoton(
      dto.streetPurok,
      hierarchy.municipality.name,
      hierarchy.barangay.name,
    );
    const selected = suggestions.find((item) => item.id === dto.streetPlaceId);
    if (!selected) {
      throw new BadRequestException('Select a verified Street/Purok suggestion before registering the driver.');
    }
    if (selected.postalCode !== dto.postalCode) {
      throw new BadRequestException('The postal code does not match the selected Bohol location.');
    }
    const coordinateTolerance = 0.00001;
    if (
      Math.abs(selected.latitude - dto.addressLatitude) > coordinateTolerance ||
      Math.abs(selected.longitude - dto.addressLongitude) > coordinateTolerance
    ) {
      throw new BadRequestException('The selected Street/Purok coordinates could not be verified.');
    }
    return {
      provinceCode: BOHOL_CODE,
      provinceName: 'Bohol',
      municipalityCode: hierarchy.municipality.code,
      municipalityName: hierarchy.municipality.name,
      barangayCode: hierarchy.barangay.code,
      barangayName: hierarchy.barangay.name,
      streetPurok: selected.name,
      postalCode: selected.postalCode,
      externalPlaceId: selected.id,
      latitude: selected.latitude,
      longitude: selected.longitude,
    };
  }

  async validateDriverPresentAddress(dto: DriverPresentAddressDto) {
    if (dto.provinceCode !== BOHOL_CODE || dto.provinceName.toLowerCase() !== 'bohol') {
      throw new BadRequestException('Driver addresses are currently limited to Bohol.');
    }
    const hierarchy = await this.requireHierarchy(dto.municipalityCode, dto.barangayCode);
    if (
      !sameLocationName(hierarchy.municipality.name, dto.municipalityName) ||
      !sameLocationName(hierarchy.barangay.name, dto.barangayName)
    ) {
      throw new BadRequestException('The municipality and barangay do not match their official PSGC records.');
    }
    return {
      provinceCode: BOHOL_CODE,
      provinceName: 'Bohol',
      municipalityCode: hierarchy.municipality.code,
      municipalityName: hierarchy.municipality.name,
      barangayCode: hierarchy.barangay.code,
      barangayName: hierarchy.barangay.name,
      purok: dto.purok.trim().replace(/\s+/g, ' '),
    };
  }

  private async requireMunicipality(code: string) {
    const item = (await this.municipalities()).find((entry) => entry.code === code);
    if (!item) throw new BadRequestException('Select a valid Bohol municipality or city.');
    return item;
  }

  private async requireHierarchy(municipalityCode: string, barangayCode: string) {
    const municipality = await this.requireMunicipality(municipalityCode);
    const barangay = (await this.barangays(municipalityCode)).find(
      (entry) => entry.code === barangayCode,
    );
    if (!barangay) throw new BadRequestException('Select a barangay that belongs to the chosen municipality.');
    return { municipality, barangay };
  }

  private async searchPhoton(query: string, municipality: string, barangay: string) {
    const baseUrl = this.config.get<string>('GEOCODING_BASE_URL', 'https://photon.komoot.io');
    const url = new URL('/api/', baseUrl);
    url.searchParams.set('q', `${query}, ${barangay}, ${municipality}, Bohol, Philippines`);
    url.searchParams.set('countrycode', 'PH');
    url.searchParams.set('bbox', BOHOL_BOUNDS);
    url.searchParams.set('limit', '12');
    url.searchParams.append('layer', 'street');
    url.searchParams.append('layer', 'locality');
    url.searchParams.append('layer', 'district');
    url.searchParams.append('layer', 'house');
    const response = await this.fetchJson<{ features?: PhotonFeature[] }>(url.toString());
    const unique = new Map<string, StreetSuggestion>();
    for (const feature of response.features ?? []) {
      const properties = feature.properties;
      const coordinates = feature.geometry?.coordinates;
      const id = properties.osm_type && properties.osm_id
        ? `${properties.osm_type}${properties.osm_id}`
        : '';
      const name = (properties.street ?? properties.name ?? '').trim();
      const postalCode = (properties.postcode ?? '').replace(/\D/g, '').slice(0, 4);
      const municipalityMatches = [properties.city, properties.county, properties.district]
        .filter(Boolean)
        .some((candidate) => sameLocationName(candidate!, municipality));
      const barangayMatches = [properties.locality, properties.district, properties.name]
        .filter(Boolean)
        .some((candidate) => sameLocationName(candidate!, barangay));
      if (
        !id ||
        !name ||
        !coordinates ||
        properties.countrycode?.toUpperCase() !== 'PH' ||
        properties.state?.trim().toLowerCase() !== 'bohol' ||
        !municipalityMatches ||
        !barangayMatches ||
        !/^\d{4}$/.test(postalCode)
      ) continue;
      unique.set(id, {
        id,
        name,
        label: [name, properties.locality ?? properties.district, properties.city ?? properties.county]
          .filter(Boolean)
          .filter((value, index, values) => values.indexOf(value) === index)
          .join(', '),
        postalCode,
        latitude: coordinates[1],
        longitude: coordinates[0],
      });
    }
    return [...unique.values()].slice(0, 8);
  }

  private async psgc<T>(path: string): Promise<T> {
    const baseUrl = this.config.get<string>('PSGC_BASE_URL', 'https://psgc.cloud/api/v2');
    return this.cachedFetch<T>(`psgc:${path}`, `${baseUrl.replace(/\/$/, '')}${path}`, 3_600_000);
  }

  private async cachedFetch<T>(key: string, url: string, ttl: number): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const value = await this.fetchJson<T>(url);
    this.cache.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12_000),
        headers: { 'user-agent': 'TriSafe/0.1 (LGU transport registry)' },
      });
      if (!response.ok) throw new Error(`upstream returned ${response.status}`);
      return await response.json() as T;
    } catch {
      throw new ServiceUnavailableException('The Philippine location directory is temporarily unavailable.');
    }
  }
}

function sameLocationName(left: string, right: string) {
  const normalize = (value: string) => value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(city of|city|municipality of|municipality)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return normalize(left) === normalize(right);
}
