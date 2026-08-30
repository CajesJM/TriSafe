import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { FaresService } from './fares.service';

describe('fare location names', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses the containing barangay boundary instead of a nearby map object', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            attributes: {
              BRGY_NAME: 'Poblacion',
              CITYMUN: 'Trinidad',
              PROVINCE: 'Bohol',
            },
          },
        ],
      }),
    }) as typeof fetch;
    const service = new FaresService(
      {} as PrismaService,
      {} as AuditService,
      {
        get: jest.fn((_key: string, fallback: string) => fallback),
      } as unknown as ConfigService,
    );

    await expect(
      service.reverseGeocode({ latitude: 10.07903, longitude: 124.33856 }),
    ).resolves.toEqual({
      name: 'Poblacion',
      context: 'Poblacion, Trinidad, Bohol',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns only barangay, municipality, and Bohol', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Kauswagan',
          display_name:
            'Kauswagan, Trinidad, Bohol, Central Visayas, 6324, Philippines',
          address: {
            village: 'Kauswagan',
            road: 'Tagbilaran North Road',
            province: 'Bohol',
            state: 'Central Visayas',
          },
        }),
      }) as typeof fetch;
    const service = new FaresService(
      {} as PrismaService,
      {} as AuditService,
      {
        get: jest.fn((_key: string, fallback: string) => fallback),
      } as unknown as ConfigService,
    );

    await expect(
      service.reverseGeocode({ latitude: 10.07903, longitude: 124.33856 }),
    ).resolves.toEqual({
      name: 'Kauswagan',
      context: 'Kauswagan, Trinidad, Bohol',
    });
  });
});
