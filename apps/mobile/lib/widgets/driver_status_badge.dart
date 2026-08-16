import 'package:flutter/material.dart';
import '../theme/trisafe_theme.dart';

class DriverStatusBadge extends StatelessWidget {
  final String status;
  final bool compact;

  const DriverStatusBadge(
      {super.key, required this.status, this.compact = false});

  @override
  Widget build(BuildContext context) {
    final normalized = status.toUpperCase();
    final (foreground, background, icon) = switch (normalized) {
      'VERIFIED' || 'ACTIVE' => (
          TriSafeColors.forest,
          const Color(0xffe5f6dd),
          Icons.verified_rounded
        ),
      'PENDING' => (
          const Color(0xff8a5a00),
          const Color(0xfffff1cd),
          Icons.schedule_rounded
        ),
      'SUSPENDED' || 'INACTIVE' => (
          TriSafeColors.danger,
          const Color(0xffffe8e6),
          Icons.block_rounded
        ),
      'EXPIRED' || 'REVOKED' => (
          const Color(0xff5f665f),
          const Color(0xffecefec),
          Icons.event_busy_rounded
        ),
      _ => (
          TriSafeColors.deepGreen,
          const Color(0xffe7f3f1),
          Icons.info_outline_rounded
        ),
    };
    return Semantics(
      label: 'Status: ${statusLabel(normalized)}',
      child: Container(
        padding: EdgeInsets.symmetric(
            horizontal: compact ? 8 : 10, vertical: compact ? 5 : 7),
        decoration: BoxDecoration(
            color: background, borderRadius: BorderRadius.circular(999)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: foreground, size: compact ? 13 : 15),
          const SizedBox(width: 5),
          Text(statusLabel(normalized),
              style: TextStyle(
                  color: foreground,
                  fontSize: compact ? 9 : 10,
                  fontWeight: FontWeight.w900)),
        ]),
      ),
    );
  }
}

String statusLabel(String status) => status
    .toLowerCase()
    .split('_')
    .map((word) =>
        word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}')
    .join(' ');
