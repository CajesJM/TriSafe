import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/auth_models.dart';
import '../models/driver_models.dart';
import '../models/fare_models.dart';
import '../models/ride_models.dart';
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

  Future<AuthSession> login(
      {required String email, required String password}) async {
    final session = AuthSession.fromJson(await _postPublic('/auth/login', {
      'email': email,
      'password': password,
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

  String _connectionMessage() =>
      'TriSafe API is unavailable at $baseUrl. Start npm run dev:api. Use adb reverse tcp:3000 tcp:3000 only when testing on a wired Android phone.';

  Future<QrVerificationResult> verifyQr(String token) async =>
      QrVerificationResult.fromJson(await _get('/vehicles/verify/$token'));
  Future<PassengerProfile> accountProfile() async =>
      PassengerProfile.fromJson(await _get('/auth/me'));
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
  Future<void> markDriverAnnouncementRead(String announcementId) async {
    await _patch('/drivers/me/announcements/$announcementId/read', {});
  }

  Future<void> updateDriverContact(
      {required String phone, required String email}) async {
    await _patch('/drivers/me/contact', {'phone': phone, 'email': email});
  }

  Future<List<LocationOption>> locations() async => (await _get('/locations'))
      .map<LocationOption>((item) => LocationOption.fromJson(item))
      .toList();
  Future<FareEstimate> estimateFare(
          {required String vehicleId,
          required String fromLocationId,
          required String toLocationId,
          int passengerCount = 1}) async =>
      FareEstimate.fromJson(await _post('/rides/preview', {
        'vehicleId': vehicleId,
        'fromLocationId': fromLocationId,
        'toLocationId': toLocationId,
        'passengerCount': passengerCount
      }));
  Future<FareEstimate> estimateDistanceFare({
    required String vehicleType,
    required double originLatitude,
    required double originLongitude,
    required double destinationLatitude,
    required double destinationLongitude,
    int passengerCount = 1,
  }) async =>
      FareEstimate.fromJson(await _post('/distance-fare-estimates', {
        'vehicleType': vehicleType,
        'originLatitude': originLatitude,
        'originLongitude': originLongitude,
        'destinationLatitude': destinationLatitude,
        'destinationLongitude': destinationLongitude,
        'passengerCount': passengerCount,
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
    int passengerCount = 1,
  }) async =>
      Ride.fromJson(await _post('/rides/map', {
        'vehicleId': vehicleId,
        'qrToken': qrToken,
        'originLatitude': originLatitude,
        'originLongitude': originLongitude,
        'destinationLatitude': destinationLatitude,
        'destinationLongitude': destinationLongitude,
        'passengerCount': passengerCount,
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

  Future<Map<String, dynamic>> shareRide(String rideId,
      {String? liveLocationUrl}) async {
    final uri = Uri.parse('$baseUrl/rides/$rideId/share').replace(
        queryParameters: liveLocationUrl == null
            ? null
            : {'liveLocationUrl': liveLocationUrl});
    return Map<String, dynamic>.from(await _getUri(uri));
  }

  Future<Map<String, dynamic>> draftIncident(String description,
          {String? rideId}) async =>
      Map<String, dynamic>.from(await _post('/incidents/draft', {
        'rawDescription': description,
        if (rideId != null) 'rideId': rideId
      }));
  Future<Map<String, dynamic>> submitIncident(String incidentId) async =>
      Map<String, dynamic>.from(
          await _post('/incidents/$incidentId/submit', {}));
  Future<List<dynamic>> emergencyContacts() async =>
      List<dynamic>.from(await _get('/safety/emergency-contacts'));
}
