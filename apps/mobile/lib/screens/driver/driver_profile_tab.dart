import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_avatar.dart';
import '../../widgets/driver_page_header.dart';
import '../../widgets/driver_status_badge.dart';

class DriverProfileTab extends StatelessWidget {
  final DriverProfile? profile;
  final VoidCallback onEditContact;
  final VoidCallback onOpenSettings;

  const DriverProfileTab({
    super.key,
    required this.profile,
    required this.onEditContact,
    required this.onOpenSettings,
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
                  DriverAvatar(
                      fullName: driver.fullName,
                      avatarData: driver.avatarData,
                      radius: 29),
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
                _ProfileRow(
                    label: 'Login identifier',
                    value: driver.username,
                    locked: true),
                _ProfileRow(
                    label: 'Operator',
                    value: driver.owner?.displayName ?? 'Not recorded',
                    locked: true),
                _ProfileRow(label: 'Phone number', value: driver.phone),
                _ProfileRow(
                    label: 'Present address',
                    value: driver.address?.displayAddress ?? 'Not recorded'),
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
                        label: const Text('Edit profile information'))),
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
                          'You may update your photo, mobile number, and present address. Your verified identity, operator, vehicle, franchise, and account status remain LGU-managed.',
                          style: TextStyle(
                              fontSize: 10,
                              height: 1.5,
                              color: TriSafeColors.muted))),
                ]),
          ),
        ],
        const SizedBox(height: 18),
        Card(
          child: ListTile(
            onTap: onOpenSettings,
            leading: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                    color: TriSafeColors.softGreen,
                    borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.settings_outlined,
                    color: TriSafeColors.forest)),
            title: const Text('Account settings',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
            subtitle: const Text(
                'Password, official policies, application information, and sign out.',
                style: TextStyle(fontSize: 9, color: TriSafeColors.muted)),
            trailing: const Icon(Icons.chevron_right_rounded,
                color: TriSafeColors.muted),
          ),
        ),
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
