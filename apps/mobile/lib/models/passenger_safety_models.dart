class TrustedContact {
  final String id;
  final String fullName;
  final String relationship;
  final String phone;
  final bool active;
  TrustedContact.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        fullName = json['fullName'] as String,
        relationship = json['relationship'] as String,
        phone = json['phone'] as String,
        active = json['active'] as bool? ?? true;
}

class PassengerIncident {
  final String id;
  final String category;
  final String status;
  final String rawDescription;
  final String? aiDraft;
  final String? finalDescription;
  final String? reviewerNotes;
  final DateTime createdAt;
  final DateTime? submittedAt;
  final String? rideId;
  final String? evidenceName;
  PassengerIncident.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        category = json['category'] as String,
        status = json['status'] as String,
        rawDescription = json['rawDescription'] as String,
        aiDraft = json['aiDraft'] as String?,
        finalDescription = json['finalDescription'] as String?,
        reviewerNotes = json['reviewerNotes'] as String?,
        createdAt = DateTime.parse(json['createdAt'].toString()),
        submittedAt = json['submittedAt'] == null
            ? null
            : DateTime.parse(json['submittedAt'].toString()),
        rideId = json['rideId'] as String?,
        evidenceName = (json['evidence'] as List<dynamic>?)?.isNotEmpty == true
            ? (json['evidence'] as List<dynamic>).first['fileName'] as String?
            : null;
}
