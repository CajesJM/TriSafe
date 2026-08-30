class FareEstimate {
  final double amount;
  final double subtotal;
  final double baseFare;
  final double distanceCharge;
  final String passengerType;
  final double discountPercent;
  final double discountAmount;
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
        subtotal = (json['subtotal'] as num?)?.toDouble() ??
            (json['amount'] as num).toDouble(),
        baseFare = (json['baseFare'] as num).toDouble(),
        distanceCharge = (json['distanceCharge'] as num).toDouble(),
        passengerType = json['passengerType'] as String? ?? 'REGULAR',
        discountPercent = (json['discountPercent'] as num?)?.toDouble() ?? 0,
        discountAmount = (json['discountAmount'] as num?)?.toDouble() ?? 0,
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

class FareLocationName {
  final String name;
  final String context;

  const FareLocationName({required this.name, required this.context});

  FareLocationName.fromJson(Map<String, dynamic> json)
      : name = json['name'] as String? ?? 'Selected location',
        context = json['context'] as String? ?? 'Bohol, Philippines';
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

  const RidePlan({required this.from, required this.to, required this.fare});
}
