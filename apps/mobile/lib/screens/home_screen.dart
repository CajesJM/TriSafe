import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../models/auth_models.dart';
import '../models/fare_models.dart';
import '../models/ride_models.dart';
import '../models/vehicle_models.dart';
import '../services/location_tracking_service.dart';
import '../services/ride_sharing_service.dart';
import '../services/trisafe_api.dart';
import '../theme/trisafe_theme.dart';
import '../widgets/emergency_contacts_sheet.dart';
import '../widgets/incident_report_dialog.dart';
import '../widgets/passenger_bottom_navigation.dart';
import '../widgets/passenger_toast.dart';
import 'login_screen.dart';
import 'passenger/passenger_dashboard_tab.dart';
import 'passenger/passenger_fare_tab.dart';
import 'passenger/passenger_profile_tab.dart';
import 'passenger/passenger_rides_tab.dart';
import 'passenger/passenger_scanner_tab.dart';
import 'qr_scanner_screen.dart';
import 'route_selection_screen.dart';

class HomeScreen extends StatefulWidget {
  final TriSafeApi api;
  final AuthSession session;

  const HomeScreen({super.key, required this.api, required this.session});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late PassengerProfile profile;
  late final LocationTrackingService locationTracking;
  final rideSharing = const RideSharingService();
  List<Ride> rides = [];
  Ride? activeRide;
  QrVerificationResult? qrVerification;
  bool loading = true;
  bool scanning = false;
  bool startingRide = false;
  int selectedTab = 0;
  int toastId = 0;
  int rideHistoryVersion = 0;
  String? toastMessage;
  PassengerToastType toastType = PassengerToastType.info;

  @override
  void initState() {
    super.initState();
    profile = PassengerProfile.fromSession(widget.session);
    locationTracking = LocationTrackingService(api: widget.api);
    _loadData();
    locationTracking.start(_handlePosition).then((enabled) {
      if (!enabled && mounted && locationTracking.permissionMessage != null) {
        _toast(locationTracking.permissionMessage!, PassengerToastType.info);
      }
    });
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait<Object>([
        widget.api.accountProfile(),
        widget.api.rideHistory(),
      ]);
      if (!mounted) return;
      final loadedRides = results[1] as List<Ride>;
      setState(() {
        profile = results[0] as PassengerProfile;
        rides = loadedRides;
        activeRide = loadedRides
            .cast<Ride?>()
            .firstWhere((ride) => ride?.status == 'ACTIVE', orElse: () => null);
        loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => loading = false);
        _toast('Some passenger data could not be refreshed.',
            PassengerToastType.error);
      }
    }
  }

  Future<void> _handlePosition(Position position) async {
    final ride = activeRide;
    if (ride == null) {
      await locationTracking.reportPresence(position);
      return;
    }
    final progress = await widget.api.recordRideLocation(ride.id,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        heading: position.heading,
        speed: position.speed);
    if (mounted && activeRide?.id == ride.id) {
      setState(() => activeRide = ride.withProgress(progress));
    }
  }

  Future<void> _scanVehicle() async {
    if (scanning) return;
    setState(() {
      selectedTab = 2;
      scanning = true;
    });
    final token = await Navigator.of(context).push<String>(
        MaterialPageRoute(builder: (_) => const QrScannerScreen()));
    if (!mounted) return;
    if (token == null) {
      setState(() => scanning = false);
      return;
    }
    try {
      final result = await widget.api.verifyQr(token);
      if (!mounted) return;
      setState(() {
        qrVerification = result;
        scanning = false;
      });
      _toast(
          result.legitimate
              ? result.message
              : 'This QR was not issued by the LGU.',
          result.eligibleForRide
              ? PassengerToastType.success
              : PassengerToastType.error);
    } catch (_) {
      if (mounted) {
        setState(() => scanning = false);
        _toast('The QR could not be verified. Try scanning it again.',
            PassengerToastType.error);
      }
    }
  }

  Future<void> _planAndStartRide() async {
    final result = qrVerification;
    final vehicle = result?.vehicle;
    if (result == null || !result.eligibleForRide || vehicle == null) {
      _toast('Only an eligible LGU-verified vehicle can start a ride.',
          PassengerToastType.error);
      return;
    }
    final plan = await Navigator.of(context).push<RidePlan>(MaterialPageRoute(
        builder: (_) =>
            RouteSelectionScreen(api: widget.api, vehicle: vehicle)));
    if (plan == null || !mounted) return;
    setState(() => startingRide = true);
    try {
      final ride = await widget.api.startRide(
          vehicleId: vehicle.vehicleId,
          fromLocationId: plan.from.id,
          toLocationId: plan.to.id,
          passengerCount: plan.passengerCount,
          startLatitude: locationTracking.latestPosition?.latitude,
          startLongitude: locationTracking.latestPosition?.longitude);
      if (!mounted) return;
      setState(() {
        activeRide = ride;
        rides = [ride, ...rides.where((item) => item.id != ride.id)];
        rideHistoryVersion++;
        selectedTab = 0;
      });
      _toast('Ride started and saved to your account.',
          PassengerToastType.success);
    } catch (_) {
      _toast('The ride could not be started. Please try again.',
          PassengerToastType.error);
    } finally {
      if (mounted) setState(() => startingRide = false);
    }
  }

  Future<void> _shareRide() async {
    final ride = activeRide;
    if (ride == null) return;
    try {
      await rideSharing.shareRide(api: widget.api, ride: ride);
      _toast(
          'SafeShare details are ready to share.', PassengerToastType.success);
    } catch (_) {
      _toast('SafeShare could not load the ride details.',
          PassengerToastType.error);
    }
  }

  Future<void> _endRide() async {
    final ride = activeRide;
    if (ride == null) return;
    final confirmed = await _confirm(
        title: 'End this ride?',
        message:
            'The final tracked distance and official fare will be saved to your ride history.',
        action: 'End ride');
    if (!confirmed) return;
    try {
      final completed = await widget.api.endRide(ride.id,
          endLatitude: locationTracking.latestPosition?.latitude,
          endLongitude: locationTracking.latestPosition?.longitude);
      if (!mounted) return;
      setState(() {
        activeRide = null;
        rides = [completed, ...rides.where((item) => item.id != completed.id)];
        rideHistoryVersion++;
      });
      _toast(
          'Ride completed. Final fare: ₱${(completed.finalFare ?? completed.estimatedFare).toStringAsFixed(2)}',
          PassengerToastType.success);
    } catch (_) {
      _toast('The ride could not be completed. Please try again.',
          PassengerToastType.error);
    }
  }

  Future<void> _openEmergencyContacts() async {
    try {
      await showEmergencyContacts(context, widget.api,
          activeRide: activeRide, onShareRide: _shareRide);
    } catch (_) {
      _toast(
          'Emergency contacts could not be loaded.', PassengerToastType.error);
    }
  }

  Future<void> _openIncidentReport() async {
    await showIncidentReport(context, widget.api, rideId: activeRide?.id);
    if (mounted) {
      _toast('Incident report assistant closed.', PassengerToastType.info);
    }
  }

  void _selectTab(int index) {
    if (index == 2) {
      setState(() => selectedTab = 2);
      _scanVehicle();
      return;
    }
    setState(() => selectedTab = index);
  }

  Future<void> _logout() async {
    final confirmed = await _confirm(
        title: 'Sign out of TriSafe?',
        message:
            'Your completed ride records will remain safely stored in your account.',
        action: 'Sign out');
    if (!confirmed || !mounted) return;
    locationTracking.stop();
    widget.api.logout();
    Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => LoginScreen(api: widget.api)),
        (_) => false);
  }

  Future<bool> _confirm(
          {required String title,
          required String message,
          required String action}) async =>
      await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
                  title: Text(title),
                  content: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 390),
                      child: Text(message)),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: Text(action))
                  ])) ??
      false;

  void _toast(String message, PassengerToastType type) {
    if (!mounted) return;
    setState(() {
      toastId++;
      toastMessage = message;
      toastType = type;
    });
  }

  @override
  Widget build(BuildContext context) {
    final vehicle = qrVerification?.eligibleForRide == true
        ? qrVerification?.vehicle
        : null;
    final tabs = <Widget>[
      PassengerDashboardTab(
          profile: profile,
          rides: rides,
          activeRide: activeRide,
          loading: loading,
          onScan: _scanVehicle,
          onOpenFare: () => _selectTab(1),
          onOpenRides: () => _selectTab(3),
          onSos: _openEmergencyContacts,
          onReport: _openIncidentReport,
          onShareRide: _shareRide,
          onEndRide: _endRide,
          onRefresh: _loadData),
      PassengerFareTab(
          api: widget.api,
          vehicle: vehicle,
          isActive: selectedTab == 1,
          onScan: _scanVehicle,
          onError: (message) => _toast(message, PassengerToastType.error),
          onSuccess: (message) => _toast(message, PassengerToastType.success)),
      PassengerScannerTab(
          result: qrVerification,
          scanning: scanning || startingRide,
          onScan: _scanVehicle,
          onPlanRide: _planAndStartRide),
      PassengerRidesTab(
          api: widget.api,
          refreshVersion: rideHistoryVersion,
          onError: (message) => _toast(message, PassengerToastType.error)),
      PassengerProfileTab(
          profile: profile, rideCount: rides.length, onLogout: _logout),
    ];
    return Scaffold(
      backgroundColor: TriSafeColors.offWhite,
      extendBody: true,
      body: Stack(children: [
        SafeArea(
            bottom: false,
            child: Center(
                child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 920),
                    child: IndexedStack(index: selectedTab, children: tabs)))),
        if (toastMessage != null)
          PassengerToast(
              key: ValueKey(toastId),
              message: toastMessage!,
              type: toastType,
              onDismiss: () {
                if (mounted) setState(() => toastMessage = null);
              }),
      ]),
      bottomNavigationBar: PassengerBottomNavigation(
          selectedIndex: selectedTab, onSelected: _selectTab),
    );
  }

  @override
  void dispose() {
    locationTracking.stop();
    super.dispose();
  }
}
