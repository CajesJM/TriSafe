import 'package:flutter/material.dart';

import '../../theme/trisafe_theme.dart';

class PassengerQuickActions extends StatelessWidget {
  final VoidCallback onScan;
  final VoidCallback onFare;
  final VoidCallback onShare;
  final VoidCallback onSos;

  const PassengerQuickActions({
    super.key,
    required this.onScan,
    required this.onFare,
    required this.onShare,
    required this.onSos,
  });

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final gap = 10.0;
          final width = (constraints.maxWidth - gap * 3) / 4;
          return Row(children: [
            _ActionButton(
              width: width,
              icon: Icons.qr_code_scanner_rounded,
              label: 'Scan QR',
              onTap: onScan,
            ),
            SizedBox(width: gap),
            _ActionButton(
              width: width,
              icon: Icons.payments_outlined,
              label: 'Fare',
              onTap: onFare,
            ),
            SizedBox(width: gap),
            _ActionButton(
              width: width,
              icon: Icons.ios_share_rounded,
              label: 'SafeShare',
              onTap: onShare,
            ),
            SizedBox(width: gap),
            _ActionButton(
              width: width,
              icon: Icons.sos_outlined,
              label: 'SOS',
              onTap: onSos,
              danger: true,
            ),
          ]);
        },
      );
}

class _ActionButton extends StatelessWidget {
  final double width;
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  const _ActionButton({
    required this.width,
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    final accent = danger ? TriSafeColors.danger : TriSafeColors.forest;
    return SizedBox(
      width: width,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: TriSafeColors.line),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: .1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: accent, size: 20),
            ),
            const SizedBox(height: 7),
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 10,
                    color: TriSafeColors.charcoal,
                    fontWeight: FontWeight.w800)),
          ]),
        ),
      ),
    );
  }
}
