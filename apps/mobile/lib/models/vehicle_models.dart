class VerifiedVehicle {
  final String driverId;
  final String driverName;
  final String franchiseNumber;
  final String franchiseExpiresAt;
  final String vehicleId;
  final String plateNumber;
  final String vehicleType;
  final String qrCodeId;

  VerifiedVehicle.fromJson(Map<String, dynamic> json)
      : driverId = json['driverId'],
        driverName = json['driverName'],
        franchiseNumber = json['franchiseNumber'],
        franchiseExpiresAt = json['franchiseExpiresAt'],
        vehicleId = json['vehicleId'],
        plateNumber = json['plateNumber'],
        vehicleType = json['vehicleType'],
        qrCodeId = json['qrCodeId'];
}
