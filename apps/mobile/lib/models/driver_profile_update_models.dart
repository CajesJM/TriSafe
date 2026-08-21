class DriverLocationOption {
  final String code;
  final String name;

  const DriverLocationOption({required this.code, required this.name});

  factory DriverLocationOption.fromJson(Map<String, dynamic> json) =>
      DriverLocationOption(
        code: json['code'] as String,
        name: json['name'] as String,
      );
}

class DriverAddressUpdate {
  final String provinceCode;
  final String provinceName;
  final String municipalityCode;
  final String municipalityName;
  final String barangayCode;
  final String barangayName;
  final String purok;

  const DriverAddressUpdate({
    required this.provinceCode,
    required this.provinceName,
    required this.municipalityCode,
    required this.municipalityName,
    required this.barangayCode,
    required this.barangayName,
    required this.purok,
  });

  Map<String, dynamic> toJson() => {
        'provinceCode': provinceCode,
        'provinceName': provinceName,
        'municipalityCode': municipalityCode,
        'municipalityName': municipalityName,
        'barangayCode': barangayCode,
        'barangayName': barangayName,
        'purok': purok,
      };
}
