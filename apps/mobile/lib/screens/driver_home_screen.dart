import 'package:flutter/material.dart';
import '../models/driver_models.dart';
import '../services/trisafe_api.dart';
import '../widgets/driver_announcement_card.dart';
import '../widgets/driver_contact_editor.dart';
import '../widgets/driver_profile_card.dart';
import 'login_screen.dart';
import '../services/location_tracking_service.dart';
import 'package:geolocator/geolocator.dart';

class DriverHomeScreen extends StatefulWidget {
  final TriSafeApi api;

  const DriverHomeScreen({super.key, required this.api});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  DriverProfile? profile;
  List<DriverAnnouncement> announcements = [];
  String? error;
  bool loading = true;
  late final LocationTrackingService locationTracking;

  @override
  void initState() {
    super.initState();
    locationTracking = LocationTrackingService(api: widget.api);
    locationTracking.start(_reportLocation);
    _load();
  }

  Future<void> _reportLocation(Position position) =>
      locationTracking.reportPresence(position);

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        widget.api.driverProfile(),
        widget.api.driverAnnouncements(),
      ]);
      if (!mounted) {
        return;
      }
      setState(() {
        profile = results[0] as DriverProfile;
        announcements = results[1] as List<DriverAnnouncement>;
        loading = false;
      });
    } catch (exception) {
      if (mounted) {
        setState(() {
          error = exception.toString();
          loading = false;
        });
      }
    }
  }

  Future<void> _editContact() async {
    final currentProfile = profile;
    if (currentProfile == null) {
      return;
    }
    await showDriverContactEditor(
        context, widget.api, currentProfile, _load);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: const Text('Driver workspace'),
            actions: [
              IconButton(
                  onPressed: loading ? null : _load,
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh profile'),
              IconButton(
                  onPressed: _signOut,
                  icon: const Icon(Icons.logout),
                  tooltip: 'Sign out')
            ]),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(20),
                    children: [
                      const Text('Welcome, driver',
                          style: TextStyle(
                              fontSize: 28, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Text('Your approved TriSafe account and LGU updates.',
                          style: TextStyle(color: Colors.grey.shade700)),
                      if (error != null) ...[
                        const SizedBox(height: 18),
                        Card(
                            color: Colors.red.shade50,
                            child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Text(error!,
                                    style: TextStyle(
                                        color: Colors.red.shade800))))
                      ],
                      if (profile != null) ...[
                        const SizedBox(height: 20),
                        DriverProfileCard(
                            profile: profile!, onEditContact: _editContact),
                      ],
                      const SizedBox(height: 24),
                      const Text('LGU announcements',
                          style: TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 12),
                      if (announcements.isEmpty)
                        Text('No current announcements.',
                            style: TextStyle(color: Colors.grey.shade700))
                      else
                        ...announcements.map((announcement) =>
                            DriverAnnouncementCard(
                                announcement: announcement)),
                    ]),
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
