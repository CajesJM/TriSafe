import 'package:flutter/material.dart';
import '../../models/auth_models.dart';
import '../../models/ride_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/active_ride_card.dart';
import '../../widgets/passenger_page_header.dart';
import '../../widgets/ride_history_card.dart';

class PassengerDashboardTab extends StatelessWidget {
  final PassengerProfile profile;
  final List<Ride> rides;
  final Ride? activeRide;
  final bool loading;
  final VoidCallback onScan;
  final VoidCallback onOpenFare;
  final VoidCallback onOpenRides;
  final VoidCallback onSos;
  final VoidCallback onReport;
  final VoidCallback onShareRide;
  final VoidCallback onEndRide;
  final Future<void> Function() onRefresh;

  const PassengerDashboardTab(
      {super.key,
      required this.profile,
      required this.rides,
      required this.activeRide,
      required this.loading,
      required this.onScan,
      required this.onOpenFare,
      required this.onOpenRides,
      required this.onSos,
      required this.onReport,
      required this.onShareRide,
      required this.onEndRide,
      required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final completed =
        rides.where((ride) => ride.status == 'COMPLETED').toList();
    final fareTotal = completed.fold<double>(
        0, (sum, ride) => sum + (ride.finalFare ?? ride.estimatedFare));
    final firstName = _firstName(profile.fullName);
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
        children: [
          PassengerPageHeader(
            eyebrow: 'PASSENGER DASHBOARD',
            title: '${_greeting(DateTime.now().hour)}, $firstName',
            description:
                'Verify your ride, check the official fare, and stay connected throughout your journey.',
            action: Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                    color: TriSafeColors.black,
                    borderRadius: BorderRadius.circular(13)),
                child: const Icon(Icons.shield_outlined,
                    color: TriSafeColors.lime)),
          ),
          const SizedBox(height: 20),
          _SafetyHero(onScan: onScan),
          const SizedBox(height: 14),
          LayoutBuilder(builder: (context, constraints) {
            final columns = constraints.maxWidth >= 640 ? 3 : 2;
            final width = (constraints.maxWidth - (columns - 1) * 10) / columns;
            return Wrap(spacing: 10, runSpacing: 10, children: [
              SizedBox(
                  width: width,
                  child: _MetricCard(
                      icon: Icons.route_rounded,
                      label: 'Completed rides',
                      value: '${completed.length}',
                      color: TriSafeColors.forest)),
              SizedBox(
                  width: width,
                  child: _MetricCard(
                      icon: Icons.payments_outlined,
                      label: 'Recorded fares',
                      value: '₱${fareTotal.toStringAsFixed(2)}',
                      color: TriSafeColors.deepGreen)),
              SizedBox(
                  width: width,
                  child: _MetricCard(
                      icon: Icons.radio_button_checked,
                      label: 'Active ride',
                      value: activeRide == null ? 'None' : 'In progress',
                      color: activeRide == null
                          ? TriSafeColors.muted
                          : TriSafeColors.lime)),
            ]);
          }),
          if (activeRide != null) ...[
            const SizedBox(height: 18),
            ActiveRideCard(
                ride: activeRide!, onShare: onShareRide, onEnd: onEndRide),
          ],
          const SizedBox(height: 22),
          _SectionTitle(
              title: 'Quick actions',
              subtitle: 'Everything important within one tap'),
          const SizedBox(height: 12),
          LayoutBuilder(builder: (context, constraints) {
            final width = constraints.maxWidth >= 620
                ? (constraints.maxWidth - 12) / 2
                : constraints.maxWidth;
            return Wrap(spacing: 12, runSpacing: 12, children: [
              SizedBox(
                  width: width,
                  child: _QuickAction(
                      icon: Icons.payments_outlined,
                      title: 'Estimate fare',
                      text: 'Use the live LGU fare matrix.',
                      onTap: onOpenFare)),
              SizedBox(
                  width: width,
                  child: _QuickAction(
                      icon: Icons.sos_outlined,
                      title: 'Emergency contacts',
                      text: 'Open verified local hotlines.',
                      onTap: onSos,
                      danger: true)),
              SizedBox(
                  width: width,
                  child: _QuickAction(
                      icon: Icons.edit_note_rounded,
                      title: 'Report an incident',
                      text: 'Prepare an AI-assisted LGU report.',
                      onTap: onReport)),
            ]);
          }),
          const SizedBox(height: 22),
          _SectionTitle(
              title: 'Activity notices',
              subtitle: 'Updates generated from your live TriSafe records'),
          const SizedBox(height: 12),
          _ActivityNotice(
            icon: activeRide == null
                ? Icons.verified_user_outlined
                : Icons.directions_rounded,
            title: activeRide == null
                ? 'Ready for a verified ride'
                : 'Ride currently active',
            text: activeRide == null
                ? 'Scan the LGU-issued QR before boarding.'
                : 'SafeShare and SOS remain available until you end the ride.',
          ),
          const SizedBox(height: 9),
          _ActivityNotice(
            icon: profile.status == 'ACTIVE'
                ? Icons.account_circle_outlined
                : Icons.person_off_outlined,
            title: 'Account ${profile.status.toLowerCase()}',
            text: profile.status == 'ACTIVE'
                ? 'Your passenger account is connected to the TriSafe database.'
                : 'Contact LGU support to restore account access.',
          ),
          const SizedBox(height: 22),
          _SectionTitle(
              title: 'Recent rides',
              subtitle: loading
                  ? 'Loading your activity…'
                  : '${rides.length} total ride record${rides.length == 1 ? '' : 's'}',
              action: TextButton(
                  onPressed: onOpenRides, child: const Text('View all'))),
          const SizedBox(height: 12),
          if (loading)
            const Center(
                child: Padding(
                    padding: EdgeInsets.all(30),
                    child: CircularProgressIndicator()))
          else if (rides.isEmpty)
            const _EmptyRides()
          else
            ...rides.take(3).map((ride) => Padding(
                padding: const EdgeInsets.only(bottom: 11),
                child: RideHistoryCard(ride: ride))),
        ],
      ),
    );
  }
}

class _SafetyHero extends StatelessWidget {
  final VoidCallback onScan;
  const _SafetyHero({required this.onScan});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
            color: TriSafeColors.black,
            borderRadius: BorderRadius.circular(22)),
        child: Row(children: [
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                    decoration: BoxDecoration(
                        color: TriSafeColors.lime.withValues(alpha: .15),
                        borderRadius: BorderRadius.circular(99)),
                    child: const Text('LGU VERIFIED',
                        style: TextStyle(
                            color: TriSafeColors.lime,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1))),
                const SizedBox(height: 13),
                const Text('Scan before you ride',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                const Text(
                    'Confirm the driver, franchise, vehicle, and QR status against the live registry.',
                    style: TextStyle(
                        color: Color(0xffc7cec7), fontSize: 12, height: 1.45)),
                const SizedBox(height: 16),
                FilledButton.icon(
                    onPressed: onScan,
                    style: FilledButton.styleFrom(
                        backgroundColor: TriSafeColors.lime,
                        foregroundColor: TriSafeColors.black),
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text('Scan vehicle QR')),
              ])),
          const SizedBox(width: 14),
          Container(
              width: 82,
              height: 104,
              decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .06),
                  borderRadius: BorderRadius.circular(18)),
              child: const Icon(Icons.qr_code_2_rounded,
                  color: TriSafeColors.lime, size: 58)),
        ]),
      );
}

class _MetricCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _MetricCard(
      {required this.icon,
      required this.label,
      required this.value,
      required this.color});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(14),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 15),
            Text(value,
                style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w900,
                    color: TriSafeColors.black)),
            const SizedBox(height: 3),
            Text(label,
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted))
          ])));
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;
  final VoidCallback onTap;
  final bool danger;
  const _QuickAction(
      {required this.icon,
      required this.title,
      required this.text,
      required this.onTap,
      this.danger = false});
  @override
  Widget build(BuildContext context) => Card(
      child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
              padding: const EdgeInsets.all(15),
              child: Row(children: [
                Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                        color: (danger
                                ? TriSafeColors.danger
                                : TriSafeColors.forest)
                            .withValues(alpha: .1),
                        borderRadius: BorderRadius.circular(12)),
                    child: Icon(icon,
                        color: danger
                            ? TriSafeColors.danger
                            : TriSafeColors.forest)),
                const SizedBox(width: 12),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(title,
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 3),
                      Text(text,
                          style: const TextStyle(
                              fontSize: 10, color: TriSafeColors.muted))
                    ])),
                const Icon(Icons.arrow_forward_rounded,
                    size: 17, color: TriSafeColors.muted)
              ]))));
}

class _ActivityNotice extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;
  const _ActivityNotice(
      {required this.icon, required this.title, required this.text});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
          color: TriSafeColors.softGreen,
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Icon(icon, color: TriSafeColors.forest, size: 20),
        const SizedBox(width: 11),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style:
                  const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(text,
              style: const TextStyle(
                  fontSize: 9, height: 1.4, color: TriSafeColors.muted))
        ]))
      ]));
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget? action;
  const _SectionTitle(
      {required this.title, required this.subtitle, this.action});
  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(subtitle,
              style: const TextStyle(fontSize: 10, color: TriSafeColors.muted))
        ])),
        if (action != null) action!
      ]);
}

class _EmptyRides extends StatelessWidget {
  const _EmptyRides();
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(18)),
      child: const Column(children: [
        Icon(Icons.route_outlined, color: TriSafeColors.muted, size: 34),
        SizedBox(height: 9),
        Text('No rides recorded yet',
            style: TextStyle(fontWeight: FontWeight.w800)),
        SizedBox(height: 4),
        Text('Your verified journeys will appear here.',
            style: TextStyle(fontSize: 10, color: TriSafeColors.muted))
      ]));
}

String _firstName(String fullName) {
  final afterComma = fullName.contains(',')
      ? fullName.split(',').last.trim()
      : fullName.trim();
  return afterComma.split(RegExp(r'\s+')).first;
}

String _greeting(int hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
