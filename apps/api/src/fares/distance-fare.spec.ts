import { calculateDistanceFare } from '@trisafe/contracts';

describe('distance fare calculation', () => {
  it('uses tracked meters and the vehicle rate without passenger charges', () => {
    const fare = calculateDistanceFare({
      baseFare: 15,
      distanceMeters: 1500,
      ratePerKm: 8,
      minimumFare: 15,
    });

    expect(fare.distanceKm).toBe(1.5);
    expect(fare.distanceCharge).toBe(12);
    expect(fare.amount).toBe(27);
  });

  it('enforces the LGU minimum fare for short trips', () => {
    const fare = calculateDistanceFare({
      baseFare: 0,
      distanceMeters: 250,
      ratePerKm: 8,
      minimumFare: 15,
    });

    expect(fare.distanceCharge).toBe(2);
    expect(fare.amount).toBe(15);
  });

  it('applies the selected policy discount after calculating the official fare', () => {
    const fare = calculateDistanceFare({
      baseFare: 15,
      distanceMeters: 1500,
      ratePerKm: 8,
      minimumFare: 15,
      passengerType: 'STUDENT',
      discountPercent: 20,
    });

    expect(fare.subtotal).toBe(27);
    expect(fare.discountAmount).toBe(5.4);
    expect(fare.amount).toBe(21.6);
  });
});
