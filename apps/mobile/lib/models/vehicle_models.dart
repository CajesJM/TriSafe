class QrVerificationResult {
  final bool legitimate;
  final bool eligibleForRide;
  final String transportStatus;
  final String? accountStatus;
  final String qrStatus;
  final String message;
  final VerifiedVehicle? vehicle;

  QrVerificationResult.fromJson(Map<String, dynamic> json)
      : legitimate = json['legitimate'] as bool? ?? false,
        eligibleForRide = json['eligibleForRide'] as bool? ?? false,
        transportStatus =
            json['transportStatus'] as String? ?? 'NOT_LGU_ISSUED',
        accountStatus = json['accountStatus'] as String?,
        qrStatus = json['qrStatus'] as String? ?? 'UNKNOWN',
        message =
            json['message'] as String? ?? 'Unable to verify this QR code.',
        vehicle = json['vehicle'] is Map<String, dynamic>
            ? VerifiedVehicle.fromJson(json['vehicle'] as Map<String, dynamic>)
            : null;
}

class VerifiedVehicle {
  final String driverId;
  final String driverName;
  final String? driverAddress;
  final String? postalCode;
  final String? franchiseNumber;
  final String? franchiseExpiresAt;
  final String vehicleId;
  final String plateNumber;
  final String vehicleType;
  final String qrCodeId;

  VerifiedVehicle.fromJson(Map<String, dynamic> json)
      : driverId = json['driverId'] as String,
        driverName = json['driverName'] as String,
        driverAddress = json['driverAddress'] as String?,
        postalCode = json['postalCode'] as String?,
        franchiseNumber = json['franchiseNumber'] as String?,
        franchiseExpiresAt = json['franchiseExpiresAt'] as String?,
        vehicleId = json['vehicleId'] as String,
        plateNumber = json['plateNumber'] as String,
        vehicleType = json['vehicleType'] as String,
        qrCodeId = json['qrCodeId'] as String;
}
