class FareEstimate {
  final double amount;
  final double baseFare;
  final double distanceCharge;
  final double passengerSurcharge;
  final String matrixVersion;
  final String disclaimer;
  final double? distanceMeters;
  final double? distanceKm;
  final double? ratePerKm;
  final String? vehicleType;
  final double? routeDurationSeconds;
  final List<FareRoutePoint> routeCoordinates;

  FareEstimate.fromJson(Map<String, dynamic> json)
      : amount = (json['amount'] as num).toDouble(),
        baseFare = (json['baseFare'] as num).toDouble(),
        distanceCharge = (json['distanceCharge'] as num).toDouble(),
        passengerSurcharge = (json['passengerSurcharge'] as num).toDouble(),
        matrixVersion = json['matrixVersion'],
        disclaimer = json['disclaimer'],
        distanceMeters = (json['distanceMeters'] as num?)?.toDouble(),
        distanceKm = (json['distanceKm'] as num?)?.toDouble(),
        ratePerKm = (json['ratePerKm'] as num?)?.toDouble(),
        vehicleType = json['vehicleType'] as String?,
        routeDurationSeconds =
            (json['routeDurationSeconds'] as num?)?.toDouble(),
        routeCoordinates = (json['routeCoordinates'] as List<dynamic>? ??
                const [])
            .map(
                (item) => FareRoutePoint.fromJson(item as Map<String, dynamic>))
            .toList();
}

class FareRoutePoint {
  final double latitude;
  final double longitude;

  FareRoutePoint.fromJson(Map<String, dynamic> json)
      : latitude = (json['latitude'] as num).toDouble(),
        longitude = (json['longitude'] as num).toDouble();
}

class LocationOption {
  final String id;
  final String name;
  LocationOption.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        name = json['name'];
}

class RidePlan {
  final LocationOption from;
  final LocationOption to;
  final FareEstimate fare;
  final int passengerCount;

  const RidePlan(
      {required this.from,
      required this.to,
      required this.fare,
      required this.passengerCount});
}
