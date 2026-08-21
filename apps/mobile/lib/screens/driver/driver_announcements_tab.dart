import 'dart:convert';

import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';

/// LGU-authored messages have a dedicated tab. Account notifications are
/// accessed from the bell in the Home dashboard.
class DriverAnnouncementsTab extends StatelessWidget {
  final List<DriverAnnouncement> announcements;
  final Future<void> Function(DriverAnnouncement) onOpenAnnouncement;

  const DriverAnnouncementsTab({
    super.key,
    required this.announcements,
    required this.onOpenAnnouncement,
  });

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
        children: [
          DriverPageHeader(
            eyebrow: 'LGU COMMUNICATIONS',
            title: 'Announcements',
            description: announcements.isEmpty
                ? 'Official notices from the LGU will appear here.'
                : 'Read official transport notices and renewal information.',
            action: Badge(
              isLabelVisible: announcements.any((item) => !item.isRead),
              label:
                  Text('${announcements.where((item) => !item.isRead).length}'),
              child: const Icon(Icons.campaign_outlined,
                  color: TriSafeColors.forest),
            ),
          ),
          const SizedBox(height: 18),
          if (announcements.isEmpty)
            const _EmptyAnnouncements()
          else
            ...announcements.map((item) => _AnnouncementCard(
                  announcement: item,
                  onOpen: () => onOpenAnnouncement(item),
                )),
        ],
      );
}

class _AnnouncementCard extends StatelessWidget {
  final DriverAnnouncement announcement;
  final VoidCallback onOpen;

  const _AnnouncementCard({required this.announcement, required this.onOpen});

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: announcement.isRead
                      ? const Color(0xffedf0ed)
                      : TriSafeColors.softGreen,
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(Icons.campaign_outlined,
                    color: announcement.isRead
                        ? TriSafeColors.muted
                        : TriSafeColors.forest,
                    size: 21),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                          child: Text(announcement.title,
                              style: const TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w900)),
                        ),
                        if (!announcement.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                                color: TriSafeColors.lime,
                                shape: BoxShape.circle),
                          ),
                      ]),
                      const SizedBox(height: 5),
                      if (announcement.imageData != null) ...[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.memory(
                            base64Decode(
                                announcement.imageData!.split(',').last),
                            height: 124,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                const SizedBox.shrink(),
                          ),
                        ),
                        const SizedBox(height: 9),
                      ],
                      Text(announcement.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 10,
                              height: 1.45,
                              color: TriSafeColors.muted)),
                      const SizedBox(height: 8),
                      Text('Published ${_date(announcement.publishedAt)}',
                          style: const TextStyle(
                              fontSize: 9, color: TriSafeColors.muted)),
                    ]),
              ),
              const SizedBox(width: 5),
              const Icon(Icons.chevron_right_rounded,
                  size: 20, color: TriSafeColors.muted),
            ]),
          ),
        ),
      );
}

class _EmptyAnnouncements extends StatelessWidget {
  const _EmptyAnnouncements();

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(children: const [
            Icon(Icons.campaign_outlined,
                size: 42, color: TriSafeColors.forest),
            SizedBox(height: 12),
            Text('No active announcements',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            SizedBox(height: 6),
            Text('New official notices from the LGU will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ]),
        ),
      );
}

String _date(DateTime value) =>
    '${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')}/${value.year}';
