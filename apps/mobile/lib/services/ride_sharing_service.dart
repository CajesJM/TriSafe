import 'package:geolocator/geolocator.dart';
import 'package:share_plus/share_plus.dart';
import '../models/ride_models.dart';
import 'trisafe_api.dart';

class RideSharingService {
  const RideSharingService();

  Future<void> shareRide({required TriSafeApi api, required Ride ride}) async {
    final locationUrl = await _currentLocationUrl();
    final details = await api.shareRide(ride.id, liveLocationUrl: locationUrl);
    final message = StringBuffer()
      ..writeln('TriSafe ride')
      ..writeln('Driver: ${details['driverName']}')
      ..writeln('Vehicle: ${details['vehiclePlateNumber']}')
      ..writeln('Route: ${details['from']} to ${details['to']}')
      ..writeln('Started: ${details['startedAt']}');

    if (details['liveLocationUrl'] != null) {
      message.writeln('Current location: ${details['liveLocationUrl']}');
    }
    await Share.share(message.toString());
  }

  Future<String?> _currentLocationUrl() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return null;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }
      final position = await Geolocator.getCurrentPosition();
      return 'https://maps.google.com/?q=${position.latitude},${position.longitude}';
    } catch (_) {
      return null;
    }
  }
}
