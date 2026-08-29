import 'package:flutter/material.dart';

import '../../theme/trisafe_theme.dart';

class PassengerJourneyOverview extends StatelessWidget {
  final int completedRides;
  final double totalFare;
  final int reportCount;
  final int trustedContactCount;

  const PassengerJourneyOverview({
    super.key,
    required this.completedRides,
    required this.totalFare,
    required this.reportCount,
    required this.trustedContactCount,
  });

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final gap = 10.0;
          final columns = constraints.maxWidth >= 620 ? 4 : 2;
          final width = (constraints.maxWidth - (columns - 1) * gap) / columns;
          final items = [
            _OverviewMetric(
              icon: Icons.route_outlined,
              label: 'Completed rides',
              value: '$completedRides',
              accent: TriSafeColors.forest,
              backgroundStart: const Color(0xffe6f7dc),
              backgroundEnd: Colors.white,
            ),
            _OverviewMetric(
              icon: Icons.payments_outlined,
              label: 'Official fares',
              value: '₱${totalFare.toStringAsFixed(2)}',
              accent: TriSafeColors.deepGreen,
              backgroundStart: const Color(0xffdff4ee),
              backgroundEnd: Colors.white,
            ),
            _OverviewMetric(
              icon: Icons.assignment_outlined,
              label: 'Reports',
              value: '$reportCount',
              accent: const Color(0xff8a5a00),
              backgroundStart: const Color(0xfffff3d9),
              backgroundEnd: Colors.white,
            ),
            _OverviewMetric(
              icon: Icons.groups_outlined,
              label: 'Trusted contacts',
              value: '$trustedContactCount',
              accent: const Color(0xff35627a),
              backgroundStart: const Color(0xffe4f0fa),
              backgroundEnd: Colors.white,
            ),
          ];
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: items
                .map((item) => SizedBox(width: width, child: item))
                .toList(),
          );
        },
      );
}

class _OverviewMetric extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color accent;
  final Color backgroundStart;
  final Color backgroundEnd;

  const _OverviewMetric({
    required this.icon,
    required this.label,
    required this.value,
    required this.accent,
    required this.backgroundStart,
    required this.backgroundEnd,
  });

  @override
  Widget build(BuildContext context) {
    final strongerBackgroundStart = Color.lerp(backgroundStart, accent, .10)!;

    return Container(
      height: 122,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [strongerBackgroundStart, backgroundEnd],
        ),
        border: Border.all(
          color: strongerBackgroundStart.withValues(alpha: .9),
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0f0f0f0f),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Stack(children: [
        Positioned(
          right: -5,
          top: -8,
          child: Icon(icon, size: 56, color: accent.withValues(alpha: .10)),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .75),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, color: accent, size: 19),
          ),
          const Spacer(),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value,
                style: const TextStyle(
                    color: TriSafeColors.black,
                    fontSize: 20,
                    fontWeight: FontWeight.w900)),
          ),
          const SizedBox(height: 3),
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 10,
                  color: TriSafeColors.charcoal,
                  fontWeight: FontWeight.w700)),
        ]),
      ]),
    );
  }
}
