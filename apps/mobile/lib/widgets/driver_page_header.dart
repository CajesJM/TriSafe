import 'package:flutter/material.dart';
import '../theme/trisafe_theme.dart';

class DriverPageHeader extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String description;
  final Widget? action;

  const DriverPageHeader({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.description,
    this.action,
  });

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(eyebrow,
                    style: const TextStyle(
                        color: TriSafeColors.forest,
                        fontSize: 10,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                Text(title, style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text(description,
                    style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
          if (action != null) ...[const SizedBox(width: 12), action!],
        ],
      );
}
