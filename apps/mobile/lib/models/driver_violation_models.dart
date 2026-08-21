class DriverViolationRecord {
  final String id;
  final String category;
  final String offenseLevel;
  final String description;
  final DateTime occurredAt;
  final String status;
  final double? penaltyAmount;
  final String penaltyStatus;
  final DateTime? dueAt;
  final String? notes;
  final DateTime createdAt;

  DriverViolationRecord.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        category = json['category'] as String,
        offenseLevel = json['offenseLevel'] as String? ?? 'FIRST_OFFENSE',
        description = json['description'] as String,
        occurredAt = DateTime.parse(json['occurredAt'].toString()),
        status = json['status'] as String,
        penaltyAmount = json['penaltyAmount'] == null
            ? null
            : double.tryParse(json['penaltyAmount'].toString()),
        penaltyStatus = json['penaltyStatus'] as String,
        dueAt = json['dueAt'] == null
            ? null
            : DateTime.parse(json['dueAt'].toString()),
        notes = json['notes'] as String?,
        createdAt = DateTime.parse(json['createdAt'].toString());
}
