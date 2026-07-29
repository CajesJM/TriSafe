import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'trisafe_api.dart';

typedef PositionHandler = Future<void> Function(Position position);

class LocationTrackingService {
  final TriSafeApi api;
  StreamSubscription<Position>? _subscription;
  bool _sending = false;

  Position? latestPosition;
  String? permissionMessage;

  LocationTrackingService({required this.api});

  Future<bool> start(PositionHandler onPosition) async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      permissionMessage = 'Turn on device location to share live ride updates.';
      return false;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      permissionMessage =
          'Location permission is required for tracked distance and the LGU live map.';
      return false;
    }

    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,
    );
    _subscription = Geolocator.getPositionStream(locationSettings: settings)
        .listen((position) async {
      latestPosition = position;
      if (_sending) return;
      _sending = true;
      try {
        await onPosition(position);
      } catch (_) {
        // A temporary network failure must not stop the device location stream.
      } finally {
        _sending = false;
      }
    });
    return true;
  }

  Future<void> reportPresence(Position position) => api.updatePresence(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        heading: position.heading,
        speed: position.speed,
      );

  Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
  }
}
