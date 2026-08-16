import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../models/driver_models.dart';
import '../services/location_tracking_service.dart';
import '../services/trisafe_api.dart';
import '../theme/trisafe_theme.dart';
import '../widgets/driver_bottom_navigation.dart';
import '../widgets/driver_contact_editor.dart';
import '../widgets/passenger_toast.dart';
import 'driver/driver_dashboard_tab.dart';
import 'driver/driver_franchise_screen.dart';
import 'driver/driver_profile_tab.dart';
import 'driver/driver_qr_tab.dart';
import 'driver/driver_updates_tab.dart';
import 'driver/driver_vehicle_tab.dart';
import 'login_screen.dart';

class DriverHomeScreen extends StatefulWidget {
  final TriSafeApi api;

  const DriverHomeScreen({super.key, required this.api});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  DriverProfile? profile;
  List<DriverAnnouncement> announcements = [];
  List<DriverNotification> notifications = [];
  bool loading = true;
  int selectedTab = 0;
  int toastId = 0;
  String? toastMessage;
  PassengerToastType toastType = PassengerToastType.info;
  late final LocationTrackingService locationTracking;

  @override
  void initState() {
    super.initState();
    locationTracking = LocationTrackingService(api: widget.api);
    locationTracking.start(_reportLocation).catchError((_) => false);
    _load();
  }

  Future<void> _reportLocation(Position position) =>
      locationTracking.reportPresence(position);

  Future<void> _load({bool silent = false}) async {
    if (!silent && mounted) setState(() => loading = true);
    try {
      final results = await Future.wait<Object>([
        widget.api.driverProfile(),
        widget.api.driverAnnouncements(),
        widget.api.driverNotifications(),
      ]);
      if (!mounted) return;
      setState(() {
        profile = results[0] as DriverProfile;
        announcements = results[1] as List<DriverAnnouncement>;
        notifications = results[2] as List<DriverNotification>;
        loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => loading = false);
      _toast(
          'Driver information could not be refreshed. Check your connection.',
          PassengerToastType.error);
    }
  }

  Future<void> _editContact() async {
    final current = profile;
    if (current == null) return;
    final saved = await showDriverContactEditor(context, widget.api, current);
    if (!saved || !mounted) return;
    await _load(silent: true);
    _toast('Contact information updated successfully.',
        PassengerToastType.success);
  }

  Future<void> _openAnnouncement(DriverAnnouncement announcement) async {
    if (!announcement.isRead) {
      try {
        await widget.api.markDriverAnnouncementRead(announcement.id);
        await _load(silent: true);
      } catch (_) {
        _toast('The announcement opened, but its read status was not saved.',
            PassengerToastType.info);
      }
    }
    if (mounted) await showDriverAnnouncementDetails(context, announcement);
  }

  void _openFranchise() {
    final current = profile;
    if (current == null) return;
    Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => DriverFranchiseScreen(profile: current)));
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            icon: const Icon(Icons.logout_rounded, color: TriSafeColors.danger),
            title: const Text('Sign out of TriSafe?'),
            content: const Text(
                'You will need your driver account credentials to sign in again.'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancel')),
              FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Sign out')),
            ],
          ),
        ) ??
        false;
    if (!confirmed || !mounted) return;
    await locationTracking.stop();
    widget.api.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => LoginScreen(api: widget.api)),
        (_) => false);
  }

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
    final tabs = <Widget>[
      DriverDashboardTab(
          profile: profile,
          announcements: announcements,
          notifications: notifications,
          loading: loading,
          onRefresh: _load,
          onOpenFranchise: _openFranchise,
          onOpenTab: (index) => setState(() => selectedTab = index)),
      DriverVehicleTab(
          profile: profile, onOpenQr: () => setState(() => selectedTab = 2)),
      DriverQrTab(profile: profile),
      DriverUpdatesTab(
          announcements: announcements,
          notifications: notifications,
          onOpenAnnouncement: _openAnnouncement),
      DriverProfileTab(
          profile: profile, onEditContact: _editContact, onLogout: _logout),
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
              child: IndexedStack(index: selectedTab, children: tabs),
            ),
          ),
        ),
        if (toastMessage != null)
          PassengerToast(
              key: ValueKey(toastId),
              message: toastMessage!,
              type: toastType,
              onDismiss: () {
                if (mounted) setState(() => toastMessage = null);
              }),
      ]),
      bottomNavigationBar: DriverBottomNavigation(
          selectedIndex: selectedTab,
          unreadCount: notifications.length,
          onSelected: (index) => setState(() => selectedTab = index)),
    );
  }

  @override
  void dispose() {
    locationTracking.stop();
    super.dispose();
  }
}
