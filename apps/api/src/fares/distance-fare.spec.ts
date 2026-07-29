import { calculateDistanceFare } from '@trisafe/contracts';

describe('distance fare calculation', () => {
  it('uses tracked meters, the vehicle rate, and passenger surcharge', () => {
    const fare = calculateDistanceFare({
      baseFare: 15,
      distanceMeters: 1500,
      ratePerKm: 8,
      passengerCount: 2,
      passengerSurcharge: 5,
      minimumFare: 15,
    });

    expect(fare.distanceKm).toBe(1.5);
    expect(fare.distanceCharge).toBe(12);
    expect(fare.passengerSurcharge).toBe(5);
    expect(fare.amount).toBe(32);
  });

  it('enforces the LGU minimum fare for short trips', () => {
    const fare = calculateDistanceFare({
      baseFare: 0,
      distanceMeters: 250,
      ratePerKm: 8,
      passengerCount: 1,
      passengerSurcharge: 0,
      minimumFare: 15,
    });

    expect(fare.distanceCharge).toBe(2);
    expect(fare.amount).toBe(15);
  });
});
