import 'package:flutter/material.dart';

import '../../theme/trisafe_theme.dart';

class PassengerDashboardLoading extends StatelessWidget {
  const PassengerDashboardLoading({super.key});

  @override
  Widget build(BuildContext context) => Column(children: [
        const _Skeleton(height: 160),
        const SizedBox(height: 20),
        Row(children: const [
          Expanded(child: _Skeleton(height: 106)),
          SizedBox(width: 10),
          Expanded(child: _Skeleton(height: 106)),
        ]),
        const SizedBox(height: 10),
        Row(children: const [
          Expanded(child: _Skeleton(height: 106)),
          SizedBox(width: 10),
          Expanded(child: _Skeleton(height: 106)),
        ]),
      ]);
}

class PassengerSafetyReminder extends StatelessWidget {
  final VoidCallback onReport;

  const PassengerSafetyReminder({super.key, required this.onReport});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: TriSafeColors.softGreen,
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: TriSafeColors.lime.withValues(alpha: .28),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.tips_and_updates_outlined,
                color: TriSafeColors.forest, size: 20),
          ),
          const SizedBox(width: 11),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Safety reminder',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              const Text(
                'Verify the official QR before every trip. If something feels unsafe, you can submit a report to the LGU.',
                style: TextStyle(
                    fontSize: 10, height: 1.4, color: TriSafeColors.muted),
              ),
              const SizedBox(height: 6),
              TextButton.icon(
                onPressed: onReport,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  foregroundColor: TriSafeColors.forest,
                ),
                icon: const Icon(Icons.edit_note_rounded, size: 17),
                label: const Text('Submit an incident report'),
              ),
            ]),
          ),
        ]),
      );
}

class _Skeleton extends StatelessWidget {
  final double height;
  const _Skeleton({required this.height});

  @override
  Widget build(BuildContext context) => Container(
        height: height,
        decoration: BoxDecoration(
          color: TriSafeColors.line.withValues(alpha: .55),
          borderRadius: BorderRadius.circular(18),
        ),
      );
}
