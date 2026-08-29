import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../models/auth_models.dart';
import '../../models/ride_models.dart';
import '../../models/vehicle_models.dart';
import '../../services/location_tracking_service.dart';
import '../../services/ride_sharing_service.dart';
import '../../services/trisafe_api.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/emergency_contacts_sheet.dart';
import '../../widgets/passenger_bottom_navigation.dart';
import '../../widgets/passenger_qr_result_modal.dart';
import '../../widgets/passenger_rating_dialog.dart';
import '../../widgets/passenger_profile_editor.dart';
import '../../widgets/passenger/passenger_notifications_sheet.dart';
import '../../widgets/passenger_toast.dart';
import '../auth/login_screen.dart';
import 'passenger_dashboard_tab.dart';
import 'passenger_fare_tab.dart';
import 'passenger_profile_tab.dart';
import 'passenger_rides_tab.dart';
import 'passenger_scanner_tab.dart';
import 'passenger_safety_screens.dart';
import '../driver/driver_account_settings_screen.dart';
import 'qr_scanner_screen.dart';

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
  String? verifiedQrToken;
  bool loading = true;
  bool scanning = false;
  int selectedTab = 0;
  int toastId = 0;
  int rideHistoryVersion = 0;
  int reportCount = 0;
  int trustedContactCount = 0;
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
        widget.api.incidentHistory(),
        widget.api.trustedContacts(),
      ]);
      if (!mounted) return;
      final loadedRides = results[1] as List<Ride>;
      setState(() {
        profile = results[0] as PassengerProfile;
        rides = loadedRides;
        reportCount = (results[2] as List).length;
        trustedContactCount = (results[3] as List).length;
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
        verifiedQrToken = result.eligibleForRide ? token : null;
        scanning = false;
      });
      final action = await showPassengerQrResultModal(context, result);
      if (!mounted) return;
      if (action == PassengerQrResultAction.continueToFare) {
        _continueVerifiedRideToFare();
      } else if (action == PassengerQrResultAction.scanAgain) {
        await _scanVehicle();
      } else {
        _toast(
            result.eligibleForRide
                ? 'QR scanned successfully.'
                : result.message,
            result.eligibleForRide
                ? PassengerToastType.success
                : PassengerToastType.error);
      }
    } catch (_) {
      if (mounted) {
        setState(() => scanning = false);
        await showPassengerQrScanErrorModal(context,
            'TriSafe could not verify this code against the LGU registry. Check your connection and scan the official vehicle QR again.');
        if (mounted) {
          _toast('QR verification failed.', PassengerToastType.error);
        }
      }
    }
  }

  void _continueVerifiedRideToFare() {
    final result = qrVerification;
    final vehicle = result?.vehicle;
    if (result == null || !result.eligibleForRide || vehicle == null) {
      _toast('Only an eligible LGU-verified vehicle can start a ride.',
          PassengerToastType.error);
      return;
    }
    setState(() => selectedTab = 1);
    _toast('QR scanned successfully. Redirecting to Fare Dashboard…',
        PassengerToastType.success);
  }

  void _rideStarted(Ride ride) {
    setState(() {
      activeRide = ride;
      rides = [ride, ...rides.where((item) => item.id != ride.id)];
      rideHistoryVersion++;
      selectedTab = 0;
    });
    _toast('Ride started. Live safety tracking is now active.',
        PassengerToastType.success);
  }

  Future<void> _shareRide() async {
    final ride = activeRide;
    if (ride == null) {
      _toast('Start a verified ride before using SafeShare.',
          PassengerToastType.info);
      return;
    }
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
      final rated =
          await showPassengerRatingDialog(context, widget.api, completed);
      if (rated && mounted) {
        _toast('Thank you for rating your verified ride.',
            PassengerToastType.success);
        await _loadData();
      }
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

  Future<void> _editPassengerProfile() async {
    final updated =
        await showPassengerProfileEditor(context, widget.api, profile);
    if (updated != null && mounted) {
      setState(() => profile = updated);
      _toast('Passenger profile updated successfully.',
          PassengerToastType.success);
    }
  }

  Future<void> _changePassengerPhoto() async {
    final updated = await pickAndSavePassengerProfilePhoto(context, widget.api);
    if (updated != null && mounted) {
      setState(() => profile = updated);
      _toast('Profile photo updated successfully.', PassengerToastType.success);
    }
  }

  Future<void> _openPassengerNotifications() async {
    await showPassengerNotificationsSheet(context);
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
          verifiedVehicle: vehicle,
          reportCount: reportCount,
          trustedContactCount: trustedContactCount,
          loading: loading,
          onScan: _scanVehicle,
          onOpenFare: () => _selectTab(1),
          onContinueVerifiedRide: _continueVerifiedRideToFare,
          onOpenRides: () => _selectTab(3),
          onSos: _openEmergencyContacts,
          onShareRide: _shareRide,
          onEndRide: _endRide,
          onChangePhoto: _changePassengerPhoto,
          onNotifications: _openPassengerNotifications,
          onRefresh: _loadData),
      PassengerFareTab(
          api: widget.api,
          vehicle: vehicle,
          qrToken: vehicle == null ? null : verifiedQrToken,
          activeRide: activeRide,
          isActive: selectedTab == 1,
          onScan: _scanVehicle,
          onRideStarted: _rideStarted,
          onError: (message) => _toast(message, PassengerToastType.error),
          onSuccess: (message) => _toast(message, PassengerToastType.success)),
      PassengerScannerTab(scanning: scanning, onScan: _scanVehicle),
      PassengerRidesTab(
          api: widget.api,
          refreshVersion: rideHistoryVersion,
          onError: (message) => _toast(message, PassengerToastType.error)),
      PassengerProfileTab(
        profile: profile,
        rideCount: rides.length,
        onLogout: _logout,
        onEditProfile: _editPassengerProfile,
        onOpenRides: () => _selectTab(3),
        onOpenReports: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => PassengerReportHistoryScreen(api: widget.api))),
        onOpenTrustedContacts: () => Navigator.of(context).push(
            MaterialPageRoute(
                builder: (_) =>
                    PassengerTrustedContactsScreen(api: widget.api))),
        onOpenSettings: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => DriverAccountSettingsScreen(
                api: widget.api, onLogout: _logout))),
      ),
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
