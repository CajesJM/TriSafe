import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';
import '../../widgets/driver_status_badge.dart';

class DriverProfileTab extends StatelessWidget {
  final DriverProfile? profile;
  final VoidCallback onEditContact;
  final VoidCallback onLogout;

  const DriverProfileTab({
    super.key,
    required this.profile,
    required this.onEditContact,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final driver = profile;
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
      children: [
        const DriverPageHeader(
            eyebrow: 'MY ACCOUNT',
            title: 'Driver profile',
            description:
                'Review your verified identity and keep your contact information current.'),
        const SizedBox(height: 18),
        if (driver != null) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(children: [
                Row(children: [
                  CircleAvatar(
                    radius: 29,
                    backgroundColor: TriSafeColors.black,
                    child: Text(_initials(driver.fullName),
                        style: const TextStyle(
                            color: TriSafeColors.lime,
                            fontWeight: FontWeight.w900)),
                  ),
                  const SizedBox(width: 13),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(driver.fullName,
                            style: const TextStyle(
                                fontSize: 17, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 4),
                        DriverStatusBadge(
                            status: driver.accountStatus, compact: true),
                      ])),
                ]),
                const Divider(height: 30),
                _ProfileRow(
                    label: 'Full name', value: driver.fullName, locked: true),
                _ProfileRow(label: 'Login identifier', value: driver.username, locked: true),
                _ProfileRow(label: 'Owner / leader', value: driver.owner?.displayName ?? 'Not recorded', locked: true),
                _ProfileRow(label: 'Phone number', value: driver.phone),
                _ProfileRow(label: 'Present address', value: driver.address?.displayAddress ?? 'Not recorded', locked: true),
                _ProfileRow(
                    label: 'Driver status',
                    value: statusLabel(driver.verification),
                    locked: true),
                const SizedBox(height: 14),
                SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                        onPressed: onEditContact,
                        icon: const Icon(Icons.edit_outlined),
                        label: const Text('Edit contact information'))),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: TriSafeColors.softGreen,
                border: Border.all(color: TriSafeColors.line),
                borderRadius: BorderRadius.circular(15)),
            child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lock_person_outlined, color: TriSafeColors.forest),
                  SizedBox(width: 10),
                  Expanded(
                      child: Text(
                          'Your verified name, owner, address, vehicle, and franchise records are LGU-managed. Contact the transport office to correct these details.',
                          style: TextStyle(
                              fontSize: 10,
                              height: 1.5,
                              color: TriSafeColors.muted))),
                ]),
          ),
        ],
        const SizedBox(height: 18),
        OutlinedButton.icon(
            onPressed: onLogout,
            style:
                OutlinedButton.styleFrom(foregroundColor: TriSafeColors.danger),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out of TriSafe')),
      ],
    );
  }
}

class _ProfileRow extends StatelessWidget {
  final String label;
  final String value;
  final bool locked;
  const _ProfileRow(
      {required this.label, required this.value, this.locked = false});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
            width: 115,
            child: Text(label,
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted))),
        Expanded(
            child: Text(value.isEmpty ? 'Not provided' : value,
                style: const TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w800))),
        if (locked)
          const Icon(Icons.lock_outline_rounded,
              size: 14, color: TriSafeColors.muted),
      ]));
}

String _initials(String name) {
  final parts = name
      .replaceAll(',', ' ')
      .split(RegExp(r'\s+'))
      .where((item) => item.isNotEmpty)
      .toList();
  if (parts.isEmpty) return 'D';
  return parts.take(2).map((item) => item[0].toUpperCase()).join();
}
