import 'package:flutter/material.dart';

class ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String label;
  final VoidCallback? onPressed;

  const ActionCard(
      {super.key,
      required this.icon,
      required this.title,
      required this.subtitle,
      required this.label,
      required this.onPressed});

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(children: [
            Icon(icon, size: 32, color: const Color(0xff185449)),
            const SizedBox(width: 14),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(title,
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(subtitle, style: const TextStyle(fontSize: 12))
                ])),
            FilledButton(onPressed: onPressed, child: Text(label)),
          ]),
        ),
      );
}
