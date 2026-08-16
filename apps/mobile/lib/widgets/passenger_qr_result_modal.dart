import 'package:flutter/material.dart';
import '../models/vehicle_models.dart';
import '../theme/trisafe_theme.dart';

enum PassengerQrResultAction { continueToFare, scanAgain, close }

Future<PassengerQrResultAction> showPassengerQrResultModal(
    BuildContext context, QrVerificationResult result) async {
  return await showDialog<PassengerQrResultAction>(
        context: context,
        barrierDismissible: false,
        builder: (context) => _PassengerQrResultDialog(result: result),
      ) ??
      PassengerQrResultAction.close;
}

Future<void> showPassengerQrScanErrorModal(
    BuildContext context, String message) async {
  await showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      icon: const Icon(Icons.qr_code_scanner_rounded,
          color: TriSafeColors.danger, size: 34),
      title: const Text('QR verification failed'),
      content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 390),
          child: Text(message)),
      actions: [
        FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Try again')),
      ],
    ),
  );
}

class _PassengerQrResultDialog extends StatelessWidget {
  final QrVerificationResult result;
  const _PassengerQrResultDialog({required this.result});

  @override
  Widget build(BuildContext context) {
    final vehicle = result.vehicle;
    final eligible = result.eligibleForRide && vehicle != null;
    final legitimate = result.legitimate;
    final accent = eligible ? TriSafeColors.forest : TriSafeColors.danger;
    final accentBackground =
        eligible ? TriSafeColors.softGreen : const Color(0xffffece9);

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520, maxHeight: 720),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                    color: accentBackground,
                    borderRadius: BorderRadius.circular(15)),
                child: Icon(
                    eligible
                        ? Icons.verified_user_rounded
                        : legitimate
                            ? Icons.gpp_bad_rounded
                            : Icons.qr_code_2_rounded,
                    color: accent,
                    size: 25),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          eligible
                              ? 'LGU vehicle verified'
                              : legitimate
                                  ? 'Ride cannot continue'
                                  : 'Unrecognized QR code',
                          style: const TextStyle(
                              fontSize: 19, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text(
                          eligible
                              ? 'Review the official transport record before boarding.'
                              : 'TriSafe blocked this ride based on the live LGU record.',
                          style: const TextStyle(
                              color: TriSafeColors.muted,
                              fontSize: 10,
                              height: 1.4)),
                    ]),
              ),
              IconButton(
                  onPressed: () =>
                      Navigator.pop(context, PassengerQrResultAction.close),
                  tooltip: 'Close verification result',
                  icon: const Icon(Icons.close_rounded)),
            ]),
            const SizedBox(height: 17),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                  color: accentBackground,
                  border: Border.all(color: accent.withValues(alpha: .2)),
                  borderRadius: BorderRadius.circular(14)),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(
                    eligible
                        ? Icons.check_circle_outline_rounded
                        : Icons.error_outline_rounded,
                    color: accent,
                    size: 20),
                const SizedBox(width: 9),
                Expanded(
                    child: Text(result.message,
                        style: TextStyle(
                            color: accent,
                            fontSize: 10,
                            height: 1.45,
                            fontWeight: FontWeight.w700))),
              ]),
            ),
            const SizedBox(height: 17),
            const Text('RIDE VERIFICATION DETAILS',
                style: TextStyle(
                    color: TriSafeColors.forest,
                    fontSize: 9,
                    letterSpacing: 1.1,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 9),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 7),
              decoration: BoxDecoration(
                  color: const Color(0xfff7f9f6),
                  border: Border.all(color: TriSafeColors.line),
                  borderRadius: BorderRadius.circular(16)),
              child: Column(children: [
                _VerificationRow(
                    icon: Icons.person_outline_rounded,
                    label: 'Driver name',
                    value: vehicle?.driverName ?? 'Not available'),
                const Divider(height: 1),
                _VerificationRow(
                    icon: vehicle?.vehicleType == 'HABAL_HABAL'
                        ? Icons.two_wheeler_rounded
                        : Icons.electric_rickshaw_rounded,
                    label: 'Vehicle type',
                    value: vehicle == null
                        ? 'Not available'
                        : _vehicleLabel(vehicle.vehicleType),
                    detail: vehicle?.plateNumber),
                const Divider(height: 1),
                _VerificationRow(
                    icon: Icons.assignment_turned_in_outlined,
                    label: 'Franchise status',
                    value: _statusLabel(result.transportStatus),
                    status: result.transportStatus),
                const Divider(height: 1),
                _VerificationRow(
                    icon: Icons.manage_accounts_outlined,
                    label: 'Account status',
                    value: _statusLabel(result.accountStatus ?? 'UNKNOWN'),
                    status: result.accountStatus),
              ]),
            ),
            if (vehicle?.franchiseNumber != null) ...[
              const SizedBox(height: 9),
              Text(
                  'Franchise ${vehicle!.franchiseNumber}${vehicle.franchiseExpiresAt == null ? '' : ' · Expires ${_formatApiDate(vehicle.franchiseExpiresAt!)}'}',
                  style: const TextStyle(
                      color: TriSafeColors.muted,
                      fontSize: 9,
                      fontWeight: FontWeight.w700)),
            ],
            const SizedBox(height: 19),
            if (eligible)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                    onPressed: () => Navigator.pop(
                        context, PassengerQrResultAction.continueToFare),
                    style: FilledButton.styleFrom(
                        backgroundColor: TriSafeColors.lime,
                        foregroundColor: TriSafeColors.black),
                    icon: const Icon(Icons.route_rounded),
                    label: const Text('Continue to Ride')),
              ),
            const SizedBox(height: 7),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                  onPressed: () =>
                      Navigator.pop(context, PassengerQrResultAction.scanAgain),
                  icon: const Icon(Icons.qr_code_scanner_rounded),
                  label:
                      Text(eligible ? 'Scan another QR' : 'Scan a valid QR')),
            ),
          ]),
        ),
      ),
    );
  }
}

class _VerificationRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? detail;
  final String? status;
  const _VerificationRow(
      {required this.icon,
      required this.label,
      required this.value,
      this.detail,
      this.status});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 11),
        child: Row(children: [
          Icon(icon, color: TriSafeColors.forest, size: 20),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 9, color: TriSafeColors.muted)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w900)),
                if (detail != null)
                  Text(detail!,
                      style: const TextStyle(
                          fontSize: 9, color: TriSafeColors.muted)),
              ])),
          if (status != null) _MiniStatus(status: status!),
        ]),
      );
}

class _MiniStatus extends StatelessWidget {
  final String status;
  const _MiniStatus({required this.status});
  @override
  Widget build(BuildContext context) {
    final normalized = status.toUpperCase();
    final good = normalized == 'VERIFIED' || normalized == 'ACTIVE';
    final pending = normalized == 'PENDING';
    final color = good
        ? TriSafeColors.forest
        : pending
            ? const Color(0xff8a5a00)
            : TriSafeColors.danger;
    return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
            color: color.withValues(alpha: .1),
            borderRadius: BorderRadius.circular(999)),
        child: Text(_statusLabel(normalized),
            style: TextStyle(
                color: color, fontSize: 8, fontWeight: FontWeight.w900)));
  }
}

String _vehicleLabel(String value) =>
    value == 'HABAL_HABAL' ? 'Habal-habal' : 'Tricycle';
String _statusLabel(String value) => value
    .toLowerCase()
    .split('_')
    .map((word) =>
        word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}')
    .join(' ');
String _formatApiDate(String value) {
  final date = DateTime.tryParse(value);
  if (date == null) return value;
  return '${date.month}/${date.day}/${date.year}';
}
