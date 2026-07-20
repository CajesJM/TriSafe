class Ride {
  final String id;
  final String status;
  final double estimatedFare;
  final String? fromLocationName;
  final String? toLocationName;
  final String? driverName;
  final String? plateNumber;
  final DateTime? startedAt;
  final DateTime? endedAt;

  Ride.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        status = json['status'] as String,
        estimatedFare = double.parse(json['estimatedFare'].toString()),
        fromLocationName = json['fromLocationName'] as String?,
        toLocationName = json['toLocationName'] as String?,
        driverName =
            (json['vehicle']?['driver']?['user']?['fullName']) as String?,
        plateNumber = json['vehicle']?['plateNumber'] as String?,
        startedAt = _parseDate(json['startedAt']),
        endedAt = _parseDate(json['endedAt']);

  static DateTime? _parseDate(dynamic value) =>
      value == null ? null : DateTime.tryParse(value.toString());
}
