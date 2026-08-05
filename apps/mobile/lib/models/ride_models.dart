class Ride {
  final String id;
  final String status;
  final double estimatedFare;
  final double? finalFare;
  final double actualDistanceMeters;
  final double? currentFare;
  final String? fromLocationName;
  final String? toLocationName;
  final String? driverName;
  final String? plateNumber;
  final String vehicleType;
  final DateTime? startedAt;
  final DateTime? endedAt;

  Ride.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        status = json['status'] as String,
        estimatedFare = double.parse(json['estimatedFare'].toString()),
        finalFare = json['finalFare'] == null
            ? null
            : double.parse(json['finalFare'].toString()),
        actualDistanceMeters =
            double.tryParse(json['actualDistanceMeters']?.toString() ?? '') ??
                0,
        currentFare = json['currentFare'] == null
            ? null
            : double.tryParse(json['currentFare'].toString()),
        fromLocationName = json['fromLocationName'] as String?,
        toLocationName = json['toLocationName'] as String?,
        driverName =
            (json['vehicle']?['driver']?['user']?['fullName']) as String?,
        plateNumber = json['vehicle']?['plateNumber'] as String?,
        vehicleType = (json['vehicleType'] ??
            json['vehicle']?['vehicleType'] ??
            'TRICYCLE') as String,
        startedAt = _parseDate(json['startedAt']),
        endedAt = _parseDate(json['endedAt']);

  static DateTime? _parseDate(dynamic value) =>
      value == null ? null : DateTime.tryParse(value.toString());

  Ride withProgress(RideProgress progress) => Ride._(
        id: id,
        status: status,
        estimatedFare: estimatedFare,
        finalFare: finalFare,
        actualDistanceMeters: progress.actualDistanceMeters,
        currentFare: progress.currentFare,
        fromLocationName: fromLocationName,
        toLocationName: toLocationName,
        driverName: driverName,
        plateNumber: plateNumber,
        vehicleType: vehicleType,
        startedAt: startedAt,
        endedAt: endedAt,
      );

  Ride._({
    required this.id,
    required this.status,
    required this.estimatedFare,
    required this.finalFare,
    required this.actualDistanceMeters,
    required this.currentFare,
    required this.fromLocationName,
    required this.toLocationName,
    required this.driverName,
    required this.plateNumber,
    required this.vehicleType,
    required this.startedAt,
    required this.endedAt,
  });
}

class RideProgress {
  final double actualDistanceMeters;
  final double currentFare;
  final bool pointAccepted;

  RideProgress.fromJson(Map<String, dynamic> json)
      : actualDistanceMeters = (json['actualDistanceMeters'] as num).toDouble(),
        currentFare = (json['currentFare']['amount'] as num).toDouble(),
        pointAccepted = json['pointAccepted'] as bool? ?? true;
}
