class DriverProfile {
  final String id;
  final String fullName;
  final String username;
  final String? avatarData;
  final String phone;
  final String accountStatus;
  final String verification;
  final DriverOwner? owner;
  final DriverAddress? address;
  final String? renewalReminder;
  final DriverFranchise? franchise;
  final List<DriverVehicle> vehicles;

  DriverProfile.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        fullName = json['fullName'] as String,
        username = json['username'] as String? ?? '',
        avatarData = json['avatarData'] as String?,
        phone = json['phone'] as String? ?? '',
        accountStatus = json['accountStatus'] as String? ?? 'ACTIVE',
        verification = json['verification'] as String,
        owner =
            json['owner'] == null ? null : DriverOwner.fromJson(json['owner']),
        address = json['address'] == null
            ? null
            : DriverAddress.fromJson(json['address']),
        renewalReminder = json['renewalReminder'] as String?,
        franchise = json['franchise'] == null
            ? null
            : DriverFranchise.fromJson(json['franchise']),
        vehicles = (json['vehicles'] as List<dynamic>? ?? [])
            .map((item) => DriverVehicle.fromJson(item))
            .toList();
}

class DriverOwner {
  final String lastName;
  final String firstName;
  final String? middleName;
  DriverOwner.fromJson(Map<String, dynamic> json)
      : lastName = json['lastName'] as String,
        firstName = json['firstName'] as String,
        middleName = json['middleName'] as String?;
  String get displayName =>
      '$lastName, $firstName${middleName?.isNotEmpty == true ? ' $middleName' : ''}';
}

class DriverAddress {
  final String provinceCode;
  final String provinceName;
  final String municipalityCode;
  final String municipalityName;
  final String barangayCode;
  final String barangayName;
  final String purok;

  DriverAddress.fromJson(Map<String, dynamic> json)
      : provinceCode = json['provinceCode'] as String? ?? '0701200000',
        provinceName = json['provinceName'] as String,
        municipalityCode = json['municipalityCode'] as String,
        municipalityName = json['municipalityName'] as String,
        barangayCode = json['barangayCode'] as String,
        barangayName = json['barangayName'] as String,
        purok = json['purok'] as String;
  String get displayAddress =>
      '$purok, $barangayName, $municipalityName, $provinceName';
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
  final String? bodyNumber;
  final String? permitNumber;
  final String? engineNumber;
  final String? chassisNumber;
  final bool isActive;
  final DriverQrCode? qrCode;

  DriverVehicle.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        plateNumber = json['plateNumber'] as String,
        vehicleType = json['vehicleType'] as String,
        makeModel = json['makeModel'] as String?,
        bodyNumber = json['bodyNumber'] as String?,
        permitNumber = json['permitNumber'] as String?,
        engineNumber = json['engineNumber'] as String?,
        chassisNumber = json['chassisNumber'] as String?,
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
  final String? imageData;

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
            : DateTime.parse(json['readAt'].toString()),
        imageData = json['announcement']['imageData'] as String?;

  bool get isRead => readAt != null;
}

class DriverNotification {
  final String id;
  final String type;
  final String priority;
  final String title;
  final String message;
  final DateTime createdAt;
  final DateTime? readAt;
  final String? announcementId;

  DriverNotification({
    required this.id,
    required this.type,
    required this.priority,
    required this.title,
    required this.message,
    required this.createdAt,
    required this.readAt,
    required this.announcementId,
  });

  DriverNotification.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        type = json['type'] as String,
        priority = json['priority'] as String,
        title = json['title'] as String,
        message = json['message'] as String,
        createdAt = DateTime.parse(json['createdAt'].toString()),
        readAt = json['readAt'] == null
            ? null
            : DateTime.parse(json['readAt'].toString()),
        announcementId = json['announcementId'] as String?;

  bool get isRead => readAt != null;

  DriverNotification markAsRead() => DriverNotification(
        id: id,
        type: type,
        priority: priority,
        title: title,
        message: message,
        createdAt: createdAt,
        readAt: DateTime.now(),
        announcementId: announcementId,
      );
}
