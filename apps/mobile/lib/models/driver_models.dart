class DriverProfile {
  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String accountStatus;
  final String verification;
  final String licenseNumber;
  final DateTime renewalDate;
  final String? renewalReminder;
  final DriverFranchise? franchise;
  final List<DriverVehicle> vehicles;

  DriverProfile.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        fullName = json['fullName'] as String,
        email = json['email'] as String? ?? '',
        phone = json['phone'] as String? ?? '',
        accountStatus = json['accountStatus'] as String? ?? 'ACTIVE',
        verification = json['verification'] as String,
        licenseNumber = json['licenseNumber'] as String,
        renewalDate = DateTime.parse(json['renewalDate'].toString()),
        renewalReminder = json['renewalReminder'] as String?,
        franchise = json['franchise'] == null
            ? null
            : DriverFranchise.fromJson(json['franchise']),
        vehicles = (json['vehicles'] as List<dynamic>? ?? [])
            .map((item) => DriverVehicle.fromJson(item))
            .toList();
}

class DriverFranchise {
  final String number;
  final String status;
  final DateTime issuedAt;
  final DateTime expiresAt;

  DriverFranchise.fromJson(Map<String, dynamic> json)
      : number = json['franchiseNumber'] as String,
        status = json['status'] as String,
        issuedAt = DateTime.parse(json['issuedAt'].toString()),
        expiresAt = DateTime.parse(json['expiresAt'].toString());
}

class DriverVehicle {
  final String id;
  final String plateNumber;
  final String vehicleType;
  final String? makeModel;
  final bool isActive;
  final DriverQrCode? qrCode;

  DriverVehicle.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        plateNumber = json['plateNumber'] as String,
        vehicleType = json['vehicleType'] as String,
        makeModel = json['makeModel'] as String?,
        isActive = json['isActive'] as bool? ?? true,
        qrCode = json['qrCode'] == null
            ? null
            : DriverQrCode.fromJson(json['qrCode']);
}

class DriverQrCode {
  final String id;
  final String token;
  final DateTime generatedAt;
  final DateTime? revokedAt;

  DriverQrCode.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        token = json['token'] as String,
        generatedAt = DateTime.parse(json['generatedAt'].toString()),
        revokedAt = json['revokedAt'] == null
            ? null
            : DateTime.parse(json['revokedAt'].toString());
}

class DriverAnnouncement {
  final String id;
  final String title;
  final String body;
  final DateTime publishedAt;
  final DateTime? expiresAt;
  final DateTime? readAt;

  DriverAnnouncement.fromJson(Map<String, dynamic> json)
      : id = json['announcement']['id'] as String,
        title = json['announcement']['title'] as String,
        body = json['announcement']['body'] as String,
        publishedAt =
            DateTime.parse(json['announcement']['publishedAt'].toString()),
        expiresAt = json['announcement']['expiresAt'] == null
            ? null
            : DateTime.parse(json['announcement']['expiresAt'].toString()),
        readAt = json['readAt'] == null
            ? null
            : DateTime.parse(json['readAt'].toString());

  bool get isRead => readAt != null;
}

class DriverNotification {
  final String id;
  final String type;
  final String priority;
  final String title;
  final String message;
  final DateTime createdAt;
  final bool read;
  final String? announcementId;

  DriverNotification.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        type = json['type'] as String,
        priority = json['priority'] as String,
        title = json['title'] as String,
        message = json['message'] as String,
        createdAt = DateTime.parse(json['createdAt'].toString()),
        read = json['read'] as bool? ?? false,
        announcementId = json['announcementId'] as String?;
}
