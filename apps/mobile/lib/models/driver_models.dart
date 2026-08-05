class DriverProfile {
  final String id;
  final String fullName;
  final String email;
  final String phone;
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
  final DateTime expiresAt;

  DriverFranchise.fromJson(Map<String, dynamic> json)
      : number = json['franchiseNumber'] as String,
        status = json['status'] as String,
        expiresAt = DateTime.parse(json['expiresAt'].toString());
}

class DriverVehicle {
  final String plateNumber;
  final String vehicleType;

  DriverVehicle.fromJson(Map<String, dynamic> json)
      : plateNumber = json['plateNumber'] as String,
        vehicleType = json['vehicleType'] as String;
}

class DriverAnnouncement {
  final String id;
  final String title;
  final String body;
  final DateTime publishedAt;

  DriverAnnouncement.fromJson(Map<String, dynamic> json)
      : id = json['announcement']['id'] as String,
        title = json['announcement']['title'] as String,
        body = json['announcement']['body'] as String,
        publishedAt =
            DateTime.parse(json['announcement']['publishedAt'].toString());
}
