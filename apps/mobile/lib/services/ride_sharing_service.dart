import 'package:geolocator/geolocator.dart';
import 'package:share_plus/share_plus.dart';
import '../models/ride_models.dart';
import 'trisafe_api.dart';

class RideSharingService {
  const RideSharingService();

  Future<void> shareRide({
    required TriSafeApi api,
    required Ride ride,
    Position? lastTrackedPosition,
  }) async {
    final position = await _currentPosition(lastTrackedPosition);
    final details = await api.shareRide(
      ride.id,
      latitude: position?.latitude,
      longitude: position?.longitude,
    );
    final message = StringBuffer()
      ..writeln('TriSafe SafeShare')
      ..writeln('Ride in progress')
      ..writeln()
      ..writeln('Driver: ${details['driverName']}')
      ..writeln('Vehicle: ${details['vehiclePlateNumber']}')
      ..writeln('From: ${details['from']}')
      ..writeln('To: ${details['to']}')
      ..writeln('Started: ${_formatRideTime(details['startedAt'])}');

    final arrival = _arrivalLabel(details['estimatedArrivalSeconds']);
    if (arrival != null) {
      message.writeln('Estimated arrival: $arrival');
    }

    if (details['liveLocationUrl'] != null) {
      message
        ..writeln()
        ..writeln('View live trip map:')
        ..writeln(details['liveLocationUrl'])
        ..writeln(
            'The map shows the passenger\'s latest shared location and destination.');
    } else {
      message
        ..writeln()
        ..writeln('Live location is temporarily unavailable.');
    }
    await Share.share(message.toString());
  }

  Future<Position?> _currentPosition(Position? lastTrackedPosition) async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return lastTrackedPosition;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return lastTrackedPosition;
      }
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
    } catch (_) {
      return lastTrackedPosition;
    }
  }

  String _formatRideTime(dynamic value) {
    final startedAt = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (startedAt == null) return 'Not available';
    final hour = startedAt.hour % 12 == 0 ? 12 : startedAt.hour % 12;
    final minute = startedAt.minute.toString().padLeft(2, '0');
    final period = startedAt.hour >= 12 ? 'PM' : 'AM';
    final month = const [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][startedAt.month - 1];
    return '$month ${startedAt.day}, ${startedAt.year} · $hour:$minute $period';
  }

  String? _arrivalLabel(dynamic value) {
    final seconds = (value as num?)?.toDouble();
    if (seconds == null || seconds <= 0) return null;
    final minutes = (seconds / 60).ceil();
    return minutes < 60
        ? 'about $minutes min'
        : 'about ${minutes ~/ 60} hr ${minutes % 60} min';
  }
}
