import 'dart:async';
import 'package:geolocator/geolocator.dart';

typedef PositionHandler = Future<void> Function(Position position);

class LocationTrackingService {
  StreamSubscription<Position>? _subscription;
  bool _sending = false;

  Position? latestPosition;
  String? permissionMessage;

  Future<bool> start(PositionHandler onPosition) async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      permissionMessage = 'Turn on device location to track your active ride.';
      return false;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      permissionMessage =
          'Location permission is required for tracked ride distance.';
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

  Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
  }
}
