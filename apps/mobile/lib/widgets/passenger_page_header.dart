import 'package:flutter/material.dart';
import '../theme/trisafe_theme.dart';

class PassengerPageHeader extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String description;
  final Widget? action;

  const PassengerPageHeader(
      {super.key,
      required this.eyebrow,
      required this.title,
      required this.description,
      this.action});

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(eyebrow,
                  style: const TextStyle(
                      color: TriSafeColors.forest,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.3)),
              const SizedBox(height: 7),
              Text(title, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 7),
              Text(description, style: Theme.of(context).textTheme.bodyMedium),
            ]),
          ),
          if (action != null) ...[const SizedBox(width: 12), action!],
        ],
      );
}
