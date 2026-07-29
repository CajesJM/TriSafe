import 'package:flutter/material.dart';
import '../models/vehicle_models.dart';
import '../models/ride_models.dart';
import '../models/fare_models.dart';
import '../services/trisafe_api.dart';
import '../services/ride_sharing_service.dart';
import '../services/location_tracking_service.dart';
import 'package:geolocator/geolocator.dart';
import '../widgets/action_card.dart';
import '../widgets/active_ride_card.dart';
import '../widgets/emergency_contacts_sheet.dart';
import '../widgets/incident_report_dialog.dart';
import '../widgets/verified_vehicle_card.dart';
import 'qr_scanner_screen.dart';
import 'route_selection_screen.dart';
import 'ride_history_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  final TriSafeApi api;
  const HomeScreen({super.key, required this.api});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  VerifiedVehicle? verifiedVehicle;
  Ride? activeRide;
  bool scanning = false;
  bool startingRide = false;
  String? error;
  final rideSharing = const RideSharingService();
  late final LocationTrackingService locationTracking;

  @override
  void initState() {
    super.initState();
    locationTracking = LocationTrackingService(api: widget.api);
    locationTracking.start(_handlePosition).then((enabled) {
      if (!enabled && mounted) {
        setState(() => error = locationTracking.permissionMessage);
      }
    });
  }

  Future<void> _handlePosition(Position position) async {
    final ride = activeRide;
    if (ride == null) {
      await locationTracking.reportPresence(position);
      return;
    }
    final progress = await widget.api.recordRideLocation(
      ride.id,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      heading: position.heading,
      speed: position.speed,
    );
    if (mounted && activeRide?.id == ride.id) {
      setState(() => activeRide = ride.withProgress(progress));
    }
  }

  Future<void> scanVehicle() async {
    setState(() {
      scanning = true;
      error = null;
    });
    final token = await Navigator.of(context).push<String>(
        MaterialPageRoute(builder: (_) => const QrScannerScreen()));
    if (token == null) {
      if (mounted) {
        setState(() => scanning = false);
      }
      return;
    }
    if (!mounted) {
      return;
    }
    try {
      final vehicle = await widget.api.verifyQr(token);
      if (mounted) {
        setState(() {
          verifiedVehicle = vehicle;
          scanning = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          error =
              'We could not verify this vehicle. Please scan a current LGU-issued QR code.';
          scanning = false;
        });
      }
    } finally {
      if (mounted && scanning) {
        setState(() => scanning = false);
      }
    }
  }

  Future<void> planAndStartRide() async {
    final vehicle = verifiedVehicle;
    if (vehicle == null) {
      return;
    }
    final plan = await Navigator.of(context).push<RidePlan>(MaterialPageRoute(
        builder: (_) =>
            RouteSelectionScreen(api: widget.api, vehicle: vehicle)));
    if (plan == null || !mounted) {
      return;
    }
    setState(() {
      startingRide = true;
      error = null;
    });
    try {
      final ride = await widget.api.startRide(
          vehicleId: vehicle.vehicleId,
          fromLocationId: plan.from.id,
          toLocationId: plan.to.id,
          passengerCount: plan.passengerCount,
          startLatitude: locationTracking.latestPosition?.latitude,
          startLongitude: locationTracking.latestPosition?.longitude);
      if (mounted) {
        setState(() => activeRide = ride);
      }
    } catch (_) {
      if (mounted) {
        setState(
            () => error = 'We could not start the ride. Please try again.');
      }
    } finally {
      if (mounted) {
        setState(() => startingRide = false);
      }
    }
  }

  Future<void> shareRide() async {
    final ride = activeRide;
    if (ride == null) {
      return;
    }
    try {
      await rideSharing.shareRide(api: widget.api, ride: ride);
    } catch (_) {
      if (mounted) {
        setState(() => error = 'SafeShare could not load the ride details.');
      }
    }
  }

  Future<void> endRide() async {
    final ride = activeRide;
    if (ride == null) {
      return;
    }
    try {
      final completed = await widget.api.endRide(
        ride.id,
        endLatitude: locationTracking.latestPosition?.latitude,
        endLongitude: locationTracking.latestPosition?.longitude,
      );
      if (mounted) {
        setState(() => activeRide = null);
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Ride completed'),
            content: Text(
              'Tracked distance: ${(completed.actualDistanceMeters / 1000).toStringAsFixed(2)} km\n'
              'Final official fare: PHP ${(completed.finalFare ?? completed.estimatedFare).toStringAsFixed(2)}',
            ),
            actions: [
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Done'),
              ),
            ],
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => error = 'We could not end the ride. Please try again.');
      }
    }
  }

  Future<void> openEmergencyContacts() async {
    try {
      await showEmergencyContacts(context, widget.api,
          activeRide: activeRide, onShareRide: shareRide);
    } catch (exception) {
      if (mounted) {
        setState(() => error = 'SOS could not load emergency contacts: $exception');
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('TriSafe'), actions: [
          IconButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => RideHistoryScreen(api: widget.api))),
              icon: const Icon(Icons.history),
              tooltip: 'Ride history'),
          IconButton(
              onPressed: _signOut,
              icon: const Icon(Icons.logout),
              tooltip: 'Sign out')
        ]),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Your safer commute',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text(
                'Verify before you ride. Know the fare. Share your journey.'),
            const SizedBox(height: 24),
            if (error != null)
              Card(
                  color: Colors.red.shade50,
                  child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(error!,
                          style: TextStyle(color: Colors.red.shade800)))),
            if (verifiedVehicle == null)
              ActionCard(
                  icon: Icons.qr_code_scanner,
                  title: 'Scan a vehicle QR',
                  subtitle: scanning
                      ? 'Verifying the QR with the LGU registry…'
                      : 'Confirm the driver and franchise with the LGU registry.',
                  onPressed: scanning ? null : scanVehicle,
                  label: scanning ? 'Verifying…' : 'Scan now')
            else
              VerifiedVehicleCard(
                  vehicle: verifiedVehicle!,
                  onContinue: activeRide == null && !startingRide
                      ? planAndStartRide
                      : null),
            if (startingRide)
              const Padding(
                  padding: EdgeInsets.symmetric(vertical: 18),
                  child: Center(child: CircularProgressIndicator())),
            if (activeRide != null)
              ActiveRideCard(
                  ride: activeRide!, onShare: shareRide, onEnd: endRide),
            const SizedBox(height: 14),
            ActionCard(
                icon: Icons.sos,
                title: 'Need help?',
                subtitle:
                    'View emergency hotlines and share your ride details.',
                onPressed: openEmergencyContacts,
                label: 'Open SOS'),
            const SizedBox(height: 14),
            ActionCard(
                icon: Icons.report_outlined,
                title: 'Report an incident',
                subtitle:
                    'Get help organizing your description before LGU review.',
                onPressed: () => showIncidentReport(context, widget.api,
                    rideId: activeRide?.id),
                label: 'Start report'),
          ],
        ),
      );

  void _signOut() {
    locationTracking.stop();
    widget.api.logout();
    Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => LoginScreen(api: widget.api)),
        (_) => false);
  }

  @override
  void dispose() {
    locationTracking.stop();
    super.dispose();
  }
}
