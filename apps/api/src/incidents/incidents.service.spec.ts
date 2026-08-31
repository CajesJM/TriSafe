import { ConflictException } from '@nestjs/common';
import { IncidentsService } from './incidents.service';

describe('IncidentsService ride report ownership', () => {
  const ride = { findFirst: jest.fn() };
  const incident = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { ride, incident };
  const ai = { draft: jest.fn() };
  const audit = { record: jest.fn() };
  let service: IncidentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncidentsService(
      prisma as never,
      ai as never,
      audit as never,
    );
  });

  it('rejects a second report for the same passenger ride', async () => {
    ride.findFirst.mockResolvedValue({ id: 'ride-1' });
    incident.findUnique.mockResolvedValue({ id: 'incident-1' });

    await expect(
      service.createDraft('passenger-1', {
        rideId: 'ride-1',
        rawDescription: 'A sufficiently detailed incident description.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(incident.create).not.toHaveBeenCalled();
    expect(ai.draft).not.toHaveBeenCalled();
  });

  it('looks up an existing report only within the passenger ride', async () => {
    incident.findFirst.mockResolvedValue({ id: 'incident-1' });

    await expect(
      service.incidentForRide('passenger-1', 'ride-1'),
    ).resolves.toEqual({ id: 'incident-1' });

    expect(incident.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { passengerId: 'passenger-1', rideId: 'ride-1' },
      }),
    );
  });

  it('replaces draft evidence when the passenger changes step one', async () => {
    incident.findFirst.mockResolvedValue({
      id: 'incident-1',
      status: 'DRAFT',
      category: 'OTHER',
    });
    incident.update.mockResolvedValue({ id: 'incident-1', evidence: [] });
    ai.draft.mockReturnValue({
      draft: 'Clearer incident description.',
      category: 'OTHER',
      missingInformation: [],
    });

    await service.updateDraft('passenger-1', 'incident-1', {
      rawDescription: 'A sufficiently detailed updated incident statement.',
      evidenceData: 'data:image/jpeg;base64,YQ==',
      evidenceName: 'updated-photo.jpg',
    });

    expect(incident.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidence: {
            deleteMany: {},
            create: expect.objectContaining({
              fileName: 'updated-photo.jpg',
            }),
          },
        }),
      }),
    );
  });
});
