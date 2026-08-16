import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_status_badge.dart';

class DriverFranchiseScreen extends StatelessWidget {
  final DriverProfile profile;
  const DriverFranchiseScreen({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    final franchise = profile.franchise;
    return Scaffold(
      appBar: AppBar(title: const Text('Franchise status')),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          if (franchise == null)
            const _MissingFranchise()
          else ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                  color: TriSafeColors.black,
                  borderRadius: BorderRadius.circular(22)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Container(
                        width: 47,
                        height: 47,
                        decoration: BoxDecoration(
                            color: TriSafeColors.lime,
                            borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.assignment_turned_in_outlined,
                            color: TriSafeColors.black),
                      ),
                      const Spacer(),
                      DriverStatusBadge(
                          status: franchise.status, compact: true),
                    ]),
                    const SizedBox(height: 18),
                    const Text('FRANCHISE NUMBER',
                        style: TextStyle(
                            color: TriSafeColors.lime,
                            fontSize: 9,
                            letterSpacing: 1,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 5),
                    Text(franchise.number,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w900)),
                  ]),
            ),
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(children: [
                  _FranchiseRow(
                      icon: Icons.event_available_outlined,
                      label: 'Issued date',
                      value: _date(franchise.issuedAt)),
                  const Divider(height: 24),
                  _FranchiseRow(
                      icon: Icons.event_busy_outlined,
                      label: 'Expiration date',
                      value: _date(franchise.expiresAt)),
                  const Divider(height: 24),
                  _FranchiseRow(
                      icon: Icons.hourglass_bottom_rounded,
                      label: 'Remaining validity',
                      value: _remaining(franchise.expiresAt)),
                  const Divider(height: 24),
                  _FranchiseRow(
                      icon: Icons.badge_outlined,
                      label: 'Driver verification',
                      value: statusLabel(profile.verification)),
                ]),
              ),
            ),
            if (profile.renewalReminder != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                    color: const Color(0xfffff1cd),
                    borderRadius: BorderRadius.circular(16)),
                child: Row(children: [
                  const Icon(Icons.notifications_active_outlined,
                      color: Color(0xff8a5a00)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: Text(profile.renewalReminder!,
                          style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xff6f500f),
                              fontWeight: FontWeight.w800))),
                ]),
              ),
            ],
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(15),
              decoration: BoxDecoration(
                  color: TriSafeColors.softGreen,
                  border: Border.all(color: TriSafeColors.line),
                  borderRadius: BorderRadius.circular(16)),
              child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline_rounded,
                        color: TriSafeColors.forest),
                    SizedBox(width: 10),
                    Expanded(
                        child: Text(
                            'Franchise renewal and status changes must be processed by the LGU. TriSafe automatically blocks ride eligibility after expiration.',
                            style: TextStyle(
                                fontSize: 10,
                                height: 1.5,
                                color: TriSafeColors.muted))),
                  ]),
            ),
          ],
        ],
      ),
    );
  }
}

class _FranchiseRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _FranchiseRow(
      {required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Row(children: [
        Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
                color: TriSafeColors.softGreen,
                borderRadius: BorderRadius.circular(11)),
            child: Icon(icon, color: TriSafeColors.forest, size: 19)),
        const SizedBox(width: 11),
        Expanded(
            child: Text(label,
                style:
                    const TextStyle(fontSize: 11, color: TriSafeColors.muted))),
        Text(value,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
      ]);
}

class _MissingFranchise extends StatelessWidget {
  const _MissingFranchise();
  @override
  Widget build(BuildContext context) => const Card(
      child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(children: [
            Icon(Icons.assignment_late_outlined,
                size: 42, color: TriSafeColors.danger),
            SizedBox(height: 12),
            Text('No franchise record',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
            SizedBox(height: 6),
            Text('Contact the LGU transport office before accepting rides.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ])));
}

String _date(DateTime value) =>
    '${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')}/${value.year}';
String _remaining(DateTime value) {
  final days = value.difference(DateTime.now()).inDays;
  if (days < 0) return 'Expired';
  if (days == 0) return 'Expires today';
  return '$days day${days == 1 ? '' : 's'}';
}
