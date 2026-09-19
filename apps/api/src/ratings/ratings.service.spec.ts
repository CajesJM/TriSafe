import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RatingsService } from './ratings.service';

describe('RatingsService resetDriverRatings', () => {
  const tx = {
    driver: { findUnique: jest.fn() },
    driverRating: { deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  let service: RatingsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    service = new RatingsService(prisma as never, { record: jest.fn() } as never);
  });

  it('requires the exact confirmation text before starting a transaction', async () => {
    await expect(service.resetDriverRatings('admin-1', 'driver-1', 'reset'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not delete ratings for a missing driver', async () => {
    tx.driver.findUnique.mockResolvedValue(null);

    await expect(service.resetDriverRatings('admin-1', 'driver-1', 'RESET'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(tx.driverRating.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects an empty reset without creating an audit entry', async () => {
    tx.driver.findUnique.mockResolvedValue({ id: 'driver-1' });
    tx.driverRating.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.resetDriverRatings('admin-1', 'driver-1', 'RESET'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('deletes only the selected driver ratings and records the count', async () => {
    tx.driver.findUnique.mockResolvedValue({ id: 'driver-1' });
    tx.driverRating.deleteMany.mockResolvedValue({ count: 3 });
    tx.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    await expect(service.resetDriverRatings('admin-1', 'driver-1', 'RESET'))
      .resolves.toEqual({ deletedCount: 3 });
    expect(tx.driverRating.deleteMany).toHaveBeenCalledWith({ where: { driverId: 'driver-1' } });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'admin-1',
        action: 'DRIVER_RATINGS_RESET',
        entityType: 'Driver',
        entityId: 'driver-1',
        details: { deletedCount: 3 },
      },
    });
  });
});
