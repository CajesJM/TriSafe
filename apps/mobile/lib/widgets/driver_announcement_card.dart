import 'package:flutter/material.dart';
import '../models/driver_models.dart';

class DriverAnnouncementCard extends StatelessWidget {
  final DriverAnnouncement announcement;

  const DriverAnnouncementCard({super.key, required this.announcement});

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.campaign_outlined, color: Color(0xff185449)),
              const SizedBox(width: 8),
              Expanded(
                  child: Text(announcement.title,
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 16))),
              Text(_formatDate(announcement.publishedAt),
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11))
            ]),
            const SizedBox(height: 10),
            Text(announcement.body,
                style: TextStyle(color: Colors.grey.shade800, height: 1.45))
          ]),
        ),
      );

  String _formatDate(DateTime date) => '${date.month}/${date.day}/${date.year}';
}
