import 'package:flutter/material.dart';
import '../models/driver_models.dart';

class DriverProfileCard extends StatelessWidget {
  final DriverProfile profile;
  final VoidCallback onEditContact;

  const DriverProfileCard(
      {super.key, required this.profile, required this.onEditContact});

  @override
  Widget build(BuildContext context) {
    final vehicle = profile.vehicles.isEmpty ? null : profile.vehicles.first;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const CircleAvatar(
                backgroundColor: Color(0xffd9eee6),
                child: Icon(Icons.person, color: Color(0xff185449))),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(profile.fullName,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w800)),
                  Text(profile.username,
                      style: TextStyle(color: Colors.grey.shade700))
                ])),
            IconButton(
                onPressed: onEditContact,
                icon: const Icon(Icons.edit_outlined),
                tooltip: 'Update contact information')
          ]),
          const Divider(height: 28),
          _InfoRow(label: 'Account status', value: profile.verification),
          _InfoRow(
              label: 'Owner / leader',
              value: profile.owner?.displayName ?? 'Not recorded'),
          _InfoRow(label: 'Phone number', value: profile.phone),
          if (profile.franchise != null) ...[
            _InfoRow(label: 'Franchise', value: profile.franchise!.number),
            _InfoRow(
                label: 'Franchise status', value: profile.franchise!.status),
            _InfoRow(
                label: 'Franchise expiry',
                value: _formatDate(profile.franchise!.expiresAt)),
          ],
          if (vehicle != null) ...[
            _InfoRow(
                label: 'Vehicle',
                value: '${vehicle.plateNumber} · ${vehicle.vehicleType}'),
          ],
          if (profile.renewalReminder != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: const Color(0xfffff1d7),
                  borderRadius: BorderRadius.circular(10)),
              child: Row(children: [
                const Icon(Icons.event, color: Color(0xffa26f21)),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(profile.renewalReminder!,
                        style: const TextStyle(
                            color: Color(0xff7b5a1f),
                            fontWeight: FontWeight.w700)))
              ]),
            )
        ]),
      ),
    );
  }

  String _formatDate(DateTime date) => '${date.month}/${date.day}/${date.year}';
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: [
          SizedBox(
              width: 125,
              child: Text(label,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12))),
          Expanded(
              child: Text(value,
                  style: const TextStyle(fontWeight: FontWeight.w700)))
        ]),
      );
}
