import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/auth_models.dart';
import '../models/driver_models.dart';
import '../models/driver_profile_update_models.dart';
import '../models/driver_rating_models.dart';
import '../models/driver_violation_models.dart';
import '../models/fare_models.dart';
import '../models/ride_models.dart';
import '../models/terms_models.dart';
import '../models/passenger_safety_models.dart';
import '../models/vehicle_models.dart';

class TriSafeApi {
  final String baseUrl;
  String? _accessToken;

  TriSafeApi({required this.baseUrl});

  Map<String, String> get _headers => {
        'content-type': 'application/json',
        if (_accessToken != null) 'authorization': 'Bearer $_accessToken',
      };

  bool get isAuthenticated => _accessToken != null;

  void logout() {
    _accessToken = null;
  }

  Future<AuthSession> login({
    required String identifier,
    required String password,
    String? expectedRole,
  }) async {
    final session = AuthSession.fromJson(await _postPublic('/auth/login', {
      'identifier': identifier.trim(),
      'password': password,
      if (expectedRole != null) 'expectedRole': expectedRole,
    }));
    _accessToken = session.accessToken;
    return session;
  }

  Future<dynamic> _postPublic(String path, Map<String, dynamic> body) async {
    try {
      final response = await http
          .post(Uri.parse('$baseUrl$path'),
              headers: {'content-type': 'application/json'},
              body: jsonEncode(body))
          .timeout(const Duration(seconds: 10));
      if (response.statusCode >= 400) {
        throw Exception(
            'TriSafe API returned ${response.statusCode}: ${response.body}');
      }
      if (response.body.trim().isEmpty) return null;
      return jsonDecode(response.body);
    } on TimeoutException {
      throw Exception(_connectionMessage());
    } on http.ClientException {
      throw Exception(_connectionMessage());
    }
  }

  Future<dynamic> _get(String path) async {
    return _getUri(Uri.parse('$baseUrl$path'));
  }

  Future<dynamic> _getUri(Uri uri) async {
    try {
      final response = await http
          .get(uri, headers: _headers)
          .timeout(const Duration(seconds: 10));
      if (response.statusCode >= 400) {
        throw Exception(
            'TriSafe API returned ${response.statusCode}: ${response.body}');
      }
      if (response.body.trim().isEmpty) return null;
      return jsonDecode(response.body);
    } on TimeoutException {
      throw Exception(_connectionMessage());
    } on http.ClientException {
      throw Exception(_connectionMessage());
    }
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    try {
      final response = await http
          .post(Uri.parse('$baseUrl$path'),
              headers: _headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 10));
      if (response.statusCode >= 400) {
        throw Exception(
            'TriSafe API returned ${response.statusCode}: ${response.body}');
      }
      return jsonDecode(response.body);
    } on TimeoutException {
      throw Exception(_connectionMessage());
    } on http.ClientException {
      throw Exception(_connectionMessage());
    }
  }

  Future<dynamic> _patch(String path, Map<String, dynamic> body) async {
    try {
      final response = await http
          .patch(Uri.parse('$baseUrl$path'),
              headers: _headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 10));
      if (response.statusCode >= 400) {
        throw Exception(
            'TriSafe API returned ${response.statusCode}: ${response.body}');
      }
      return jsonDecode(response.body);
    } on TimeoutException {
      throw Exception(_connectionMessage());
    } on http.ClientException {
      throw Exception(_connectionMessage());
    }
  }

  Future<dynamic> _delete(String path) async {
    final response = await http
        .delete(Uri.parse('$baseUrl$path'), headers: _headers)
        .timeout(const Duration(seconds: 10));
    if (response.statusCode >= 400) {
      throw Exception(
          'TriSafe API returned ${response.statusCode}: ${response.body}');
    }
    return response.body.trim().isEmpty ? null : jsonDecode(response.body);
  }

  String _connectionMessage() =>
      'TriSafe API is unavailable at $baseUrl. Start npm run dev:api. Use adb reverse tcp:3000 tcp:3000 only when testing on a wired Android phone.';

  Future<QrVerificationResult> verifyQr(String token) async =>
      QrVerificationResult.fromJson(await _get('/vehicles/verify/$token'));
  Future<PassengerProfile> accountProfile() async =>
      PassengerProfile.fromJson(await _get('/auth/me'));
  Future<PassengerProfile> updatePassengerProfile(
          {String? phone,
          String? email,
          String? avatarData,
          bool updateAvatar = false}) async =>
      PassengerProfile.fromJson(await _patch('/auth/me/profile', {
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (updateAvatar) 'avatarData': avatarData
      }));
  Future<DriverProfile> driverProfile() async =>
      DriverProfile.fromJson(await _get('/drivers/me'));
  Future<List<DriverAnnouncement>> driverAnnouncements() async =>
      (await _get('/drivers/me/announcements'))
          .map<DriverAnnouncement>((item) => DriverAnnouncement.fromJson(item))
          .toList();
  Future<List<DriverNotification>> driverNotifications() async =>
      (await _get('/drivers/me/notifications'))
          .map<DriverNotification>((item) => DriverNotification.fromJson(item))
          .toList();
  Future<List<DriverViolationRecord>> driverViolations() async =>
      (await _get('/drivers/me/violations'))
          .map<DriverViolationRecord>(
              (item) => DriverViolationRecord.fromJson(item))
          .toList();
  Future<DriverRatingStatistics> driverRatingStatistics() async =>
      DriverRatingStatistics.fromJson(await _get('/ratings/driver/me'));
  Future<void> markDriverAnnouncementRead(String announcementId) async {
    await _patch('/drivers/me/announcements/$announcementId/read', {});
  }

  Future<void> markDriverNotificationRead(String notificationId) async {
    await _patch('/drivers/me/notifications/$notificationId/read', {});
  }

  Future<void> markAllDriverNotificationsRead() async {
    await _patch('/drivers/me/notifications/read-all', {});
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _patch('/auth/me/password', {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  Future<PublishedTermsDocument?> currentTerms() async {
    final response = await _get('/terms/current');
    if (response == null) return null;
    return PublishedTermsDocument.fromJson(response as Map<String, dynamic>);
  }

  Future<void> updateDriverContact({required String phone}) async {
    await _patch('/drivers/me/contact', {'phone': phone});
  }

  Future<List<DriverLocationOption>> driverMunicipalities() async =>
      (await _get('/drivers/me/locations/bohol/municipalities'))
          .map<DriverLocationOption>(
              (item) => DriverLocationOption.fromJson(item))
          .toList();

  Future<List<DriverLocationOption>> driverBarangays(
          String municipalityCode) async =>
      (await _get(
              '/drivers/me/locations/bohol/municipalities/${Uri.encodeComponent(municipalityCode)}/barangays'))
          .map<DriverLocationOption>(
              (item) => DriverLocationOption.fromJson(item))
          .toList();

  Future<DriverProfile> updateDriverProfile({
    String? phone,
    String? avatarData,
    bool updateAvatar = false,
    DriverAddressUpdate? address,
  }) async {
    final body = <String, dynamic>{
      if (phone != null) 'phone': phone,
      if (updateAvatar) 'avatarData': avatarData,
      if (address != null) 'address': address.toJson(),
    };
    return DriverProfile.fromJson(await _patch('/drivers/me/profile', body));
  }

  Future<List<LocationOption>> locations() async => (await _get('/locations'))
      .map<LocationOption>((item) => LocationOption.fromJson(item))
      .toList();
  Future<FareEstimate> estimateFare(
          {required String vehicleId,
          required String fromLocationId,
          required String toLocationId}) async =>
      FareEstimate.fromJson(await _post('/rides/preview', {
        'vehicleId': vehicleId,
        'fromLocationId': fromLocationId,
        'toLocationId': toLocationId,
      }));
  Future<FareEstimate> estimateDistanceFare({
    required String vehicleType,
    required String passengerType,
    required double originLatitude,
    required double originLongitude,
    required double destinationLatitude,
    required double destinationLongitude,
  }) async =>
      FareEstimate.fromJson(await _post('/distance-fare-estimates', {
        'vehicleType': vehicleType,
        'passengerType': passengerType,
        'originLatitude': originLatitude,
        'originLongitude': originLongitude,
        'destinationLatitude': destinationLatitude,
        'destinationLongitude': destinationLongitude,
      }));
  Future<FareLocationName> fareLocationName({
    required double latitude,
    required double longitude,
  }) async =>
      FareLocationName.fromJson(await _post('/fare-location-names', {
        'latitude': latitude,
        'longitude': longitude,
      }));
  Future<Ride> startRide(
          {required String vehicleId,
          required String fromLocationId,
          required String toLocationId,
          int passengerCount = 1,
          double? startLatitude,
          double? startLongitude}) async =>
      Ride.fromJson(await _post('/rides', {
        'vehicleId': vehicleId,
        'fromLocationId': fromLocationId,
        'toLocationId': toLocationId,
        'passengerCount': passengerCount,
        if (startLatitude != null) 'startLatitude': startLatitude,
        if (startLongitude != null) 'startLongitude': startLongitude,
      }));
  Future<Ride> startMapRide({
    required String vehicleId,
    required String qrToken,
    required double originLatitude,
    required double originLongitude,
    required double destinationLatitude,
    required double destinationLongitude,
    String? originLocationName,
    String? destinationLocationName,
    required String passengerType,
    int passengerCount = 1,
  }) async =>
      Ride.fromJson(await _post('/rides/map', {
        'vehicleId': vehicleId,
        'qrToken': qrToken,
        'originLatitude': originLatitude,
        'originLongitude': originLongitude,
        'destinationLatitude': destinationLatitude,
        'destinationLongitude': destinationLongitude,
        if (originLocationName != null)
          'originLocationName': originLocationName,
        if (destinationLocationName != null)
          'destinationLocationName': destinationLocationName,
        'passengerCount': passengerCount,
        'passengerType': passengerType,
      }));
  Future<Ride> endRide(String rideId,
          {double? endLatitude, double? endLongitude}) async =>
      Ride.fromJson(await _post('/rides/$rideId/end', {
        if (endLatitude != null) 'endLatitude': endLatitude,
        if (endLongitude != null) 'endLongitude': endLongitude,
      }));
  Future<void> updatePresence(
      {required double latitude,
      required double longitude,
      double? accuracy,
      double? heading,
      double? speed}) async {
    await _post('/presence/me', {
      'latitude': latitude,
      'longitude': longitude,
      if (accuracy != null) 'accuracy': accuracy,
      if (heading != null) 'heading': heading,
      if (speed != null) 'speed': speed,
    });
  }

  Future<RideProgress> recordRideLocation(String rideId,
          {required double latitude,
          required double longitude,
          double? accuracy,
          double? heading,
          double? speed}) async =>
      RideProgress.fromJson(await _post('/rides/$rideId/location', {
        'latitude': latitude,
        'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
        if (heading != null) 'heading': heading,
        if (speed != null) 'speed': speed,
      }));
  Future<List<Ride>> rideHistory({DateTime? from, DateTime? to}) async {
    final uri = Uri.parse('$baseUrl/rides').replace(queryParameters: {
      if (from != null) 'from': from.toUtc().toIso8601String(),
      if (to != null) 'to': to.toUtc().toIso8601String(),
    });
    return (await _getUri(uri))
        .map<Ride>((item) => Ride.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> shareRide(
    String rideId, {
    double? latitude,
    double? longitude,
  }) async {
    final uri = Uri.parse('$baseUrl/rides/$rideId/share').replace(
      queryParameters: latitude != null && longitude != null
          ? {
              'latitude': latitude.toString(),
              'longitude': longitude.toString(),
            }
          : null,
    );
    return Map<String, dynamic>.from(await _getUri(uri));
  }

  Future<Map<String, dynamic>> draftIncident(String description,
          {String? rideId,
          String? category,
          String? evidenceData,
          String? evidenceName}) async =>
      Map<String, dynamic>.from(await _post('/incidents/draft', {
        'rawDescription': description,
        if (rideId != null) 'rideId': rideId,
        if (category != null) 'category': category,
        if (evidenceData != null) 'evidenceData': evidenceData,
        if (evidenceName != null) 'evidenceName': evidenceName,
      }));
  Future<Map<String, dynamic>> submitIncident(String incidentId,
          {String? finalDescription, String? category}) async =>
      Map<String, dynamic>.from(await _post('/incidents/$incidentId/submit', {
        if (finalDescription != null) 'finalDescription': finalDescription,
        if (category != null) 'category': category
      }));
  Future<List<PassengerIncident>> incidentHistory() async =>
      (await _get('/incidents'))
          .map<PassengerIncident>((item) =>
              PassengerIncident.fromJson(item as Map<String, dynamic>))
          .toList();
  Future<void> createRating(
          {required String rideId,
          required int score,
          String? comment}) async =>
      _post('/ratings', {
        'rideId': rideId,
        'score': score,
        if (comment?.trim().isNotEmpty == true) 'comment': comment!.trim()
      });
  Future<List<TrustedContact>> trustedContacts() async =>
      (await _get('/safety/trusted-contacts'))
          .map<TrustedContact>(
              (item) => TrustedContact.fromJson(item as Map<String, dynamic>))
          .toList();
  Future<TrustedContact> saveTrustedContact(
          {String? id,
          required String fullName,
          required String relationship,
          required String phone,
          bool active = true}) async =>
      TrustedContact.fromJson(id == null
          ? await _post('/safety/trusted-contacts', {
              'fullName': fullName,
              'relationship': relationship,
              'phone': phone,
              'active': active
            })
          : await _patch('/safety/trusted-contacts/$id', {
              'fullName': fullName,
              'relationship': relationship,
              'phone': phone,
              'active': active
            }));
  Future<void> deleteTrustedContact(String id) async =>
      _delete('/safety/trusted-contacts/$id');
  Future<List<dynamic>> emergencyContacts() async =>
      List<dynamic>.from(await _get('/safety/emergency-contacts'));
}
