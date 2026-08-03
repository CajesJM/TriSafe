import 'package:flutter/material.dart';
import '../models/vehicle_models.dart';

class VehicleVerificationCard extends StatelessWidget {
  final QrVerificationResult result;
  final VoidCallback? onContinue;
  final VoidCallback onScanAgain;

  const VehicleVerificationCard({
    super.key,
    required this.result,
    required this.onContinue,
    required this.onScanAgain,
  });

  @override
  Widget build(BuildContext context) {
    final presentation = _presentation(result);
    final vehicle = result.vehicle;
    return Card(
      color: presentation.background,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: presentation.color.withValues(alpha: .35)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(color: presentation.color.withValues(alpha: .12), borderRadius: BorderRadius.circular(10)),
              child: Icon(presentation.icon, color: presentation.color),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(presentation.title, style: TextStyle(color: presentation.color, fontWeight: FontWeight.w800)),
              Text(result.legitimate ? 'LGU registry result' : 'Unrecognized identity', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
            ])),
          ]),
          const SizedBox(height: 14),
          Text(result.message, style: const TextStyle(height: 1.4, fontWeight: FontWeight.w600)),
          if (vehicle != null) ...[
            const SizedBox(height: 16),
            Text(vehicle.driverName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text('${vehicle.vehicleType.replaceAll('_', ' ')} · ${vehicle.plateNumber}'),
            Text(vehicle.franchiseNumber == null ? 'No franchise record' : 'Franchise ${vehicle.franchiseNumber}'),
            const SizedBox(height: 14),
            Wrap(spacing: 8, runSpacing: 8, children: [
              _StatusChip(label: 'Transport: ${_label(result.transportStatus)}', color: presentation.color),
              _StatusChip(label: 'QR: ${_label(result.qrStatus)}', color: result.qrStatus == 'ACTIVE' ? const Color(0xff337418) : Colors.red.shade700),
              if (result.accountStatus != null) _StatusChip(label: 'Account: ${_label(result.accountStatus!)}', color: result.accountStatus == 'ACTIVE' ? const Color(0xff337418) : Colors.red.shade700),
            ]),
          ],
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: OutlinedButton.icon(onPressed: onScanAgain, icon: const Icon(Icons.qr_code_scanner), label: const Text('Scan another'))),
            if (result.eligibleForRide) ...[
              const SizedBox(width: 9),
              Expanded(child: FilledButton.icon(onPressed: onContinue, icon: const Icon(Icons.route), label: const Text('Plan ride'))),
            ],
          ]),
        ]),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  const _StatusChip({required this.label, required this.color});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
    decoration: BoxDecoration(color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(999)),
    child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800)),
  );
}

({String title, IconData icon, Color color, Color background}) _presentation(QrVerificationResult result) {
  if (!result.legitimate) return (title: 'Not an LGU-issued QR', icon: Icons.gpp_bad_outlined, color: const Color(0xffa52323), background: const Color(0xffffeeee));
  if (result.qrStatus == 'REVOKED') return (title: 'QR code revoked', icon: Icons.block, color: const Color(0xffa52323), background: const Color(0xffffeeee));
  switch (result.transportStatus) {
    case 'PENDING': return (title: 'Pending LGU approval', icon: Icons.hourglass_top, color: const Color(0xff8a6500), background: const Color(0xfffff7dc));
    case 'SUSPENDED': return (title: 'Driver suspended', icon: Icons.report_gmailerrorred, color: const Color(0xffa52323), background: const Color(0xffffeeee));
    case 'EXPIRED': return (title: 'Franchise expired', icon: Icons.event_busy, color: const Color(0xff626262), background: const Color(0xffeeeeee));
    default: return (title: 'Verified by TriSafe', icon: Icons.verified, color: const Color(0xff337418), background: const Color(0xffeaf7e4));
  }
}

String _label(String value) => value.replaceAll('_', ' ').toLowerCase().split(' ').map((word) => word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}').join(' ');
