import 'dart:convert';

import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';

class DriverUpdatesTab extends StatelessWidget {
  final List<DriverAnnouncement> announcements;
  final List<DriverNotification> notifications;
  final Future<void> Function(DriverAnnouncement) onOpenAnnouncement;

  const DriverUpdatesTab({
    super.key,
    required this.announcements,
    required this.notifications,
    required this.onOpenAnnouncement,
  });

  @override
  Widget build(BuildContext context) => DefaultTabController(
        length: 2,
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 24, 18, 0),
            child: DriverPageHeader(
              eyebrow: 'LGU COMMUNICATIONS',
              title: 'Updates',
              description:
                  'Official announcements, renewal reminders, and account notifications.',
              action: Badge(
                isLabelVisible: notifications.isNotEmpty,
                label: Text('${notifications.length}'),
                child: const Icon(Icons.notifications_none_rounded,
                    color: TriSafeColors.forest),
              ),
            ),
          ),
          const SizedBox(height: 15),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                  color: const Color(0xffe9eee7),
                  borderRadius: BorderRadius.circular(14)),
              child: TabBar(
                indicator: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(11),
                    boxShadow: const [
                      BoxShadow(color: Color(0x16000000), blurRadius: 8)
                    ]),
                dividerColor: Colors.transparent,
                labelColor: TriSafeColors.black,
                unselectedLabelColor: TriSafeColors.muted,
                labelStyle:
                    const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                tabs: [
                  Tab(text: 'Announcements (${announcements.length})'),
                  Tab(text: 'Notifications (${notifications.length})'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: TabBarView(children: [
              _AnnouncementList(
                  announcements: announcements,
                  onOpenAnnouncement: onOpenAnnouncement),
              _NotificationList(notifications: notifications),
            ]),
          ),
        ]),
      );
}

class _AnnouncementList extends StatelessWidget {
  final List<DriverAnnouncement> announcements;
  final Future<void> Function(DriverAnnouncement) onOpenAnnouncement;
  const _AnnouncementList(
      {required this.announcements, required this.onOpenAnnouncement});

  @override
  Widget build(BuildContext context) {
    if (announcements.isEmpty) {
      return const _UpdatesEmpty(
          icon: Icons.campaign_outlined,
          title: 'No active announcements',
          message: 'Official notices published by the LGU will appear here.');
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 112),
      itemCount: announcements.length,
      itemBuilder: (context, index) {
        final item = announcements[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: InkWell(
            onTap: () => onOpenAnnouncement(item),
            borderRadius: BorderRadius.circular(18),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                      color: item.isRead
                          ? const Color(0xffedf0ed)
                          : TriSafeColors.softGreen,
                      borderRadius: BorderRadius.circular(13)),
                  child: Icon(Icons.campaign_outlined,
                      color: item.isRead
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
                            child: Text(item.title,
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900))),
                        if (!item.isRead)
                          Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                  color: TriSafeColors.lime,
                                  shape: BoxShape.circle)),
                      ]),
                      const SizedBox(height: 5),
                      Text(item.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 10,
                              height: 1.45,
                              color: TriSafeColors.muted)),
                      const SizedBox(height: 8),
                      Text('Published ${_date(item.publishedAt)}',
                          style: const TextStyle(
                              fontSize: 9, color: TriSafeColors.muted)),
                    ])),
                const SizedBox(width: 5),
                const Icon(Icons.chevron_right_rounded,
                    size: 20, color: TriSafeColors.muted),
              ]),
            ),
          ),
        );
      },
    );
  }
}

class _NotificationList extends StatelessWidget {
  final List<DriverNotification> notifications;
  const _NotificationList({required this.notifications});

  @override
  Widget build(BuildContext context) {
    if (notifications.isEmpty) {
      return const _UpdatesEmpty(
          icon: Icons.notifications_none_rounded,
          title: 'You are all caught up',
          message: 'There are no important account or renewal reminders.');
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 112),
      itemCount: notifications.length,
      itemBuilder: (context, index) =>
          _NotificationCard(notification: notifications[index]),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final DriverNotification notification;
  const _NotificationCard({required this.notification});

  @override
  Widget build(BuildContext context) {
    final (color, background, icon) = switch (notification.priority) {
      'CRITICAL' => (
          TriSafeColors.danger,
          const Color(0xffffece9),
          Icons.error_outline_rounded
        ),
      'WARNING' => (
          const Color(0xff8a5a00),
          const Color(0xfffff4d9),
          Icons.notification_important_outlined
        ),
      _ => (
          TriSafeColors.forest,
          TriSafeColors.softGreen,
          Icons.info_outline_rounded
        ),
    };
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                  color: background, borderRadius: BorderRadius.circular(13)),
              child: Icon(icon, color: color, size: 21)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Row(children: [
                  Expanded(
                      child: Text(notification.title,
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w900))),
                  Text(notification.priority,
                      style: TextStyle(
                          color: color,
                          fontSize: 8,
                          letterSpacing: .7,
                          fontWeight: FontWeight.w900)),
                ]),
                const SizedBox(height: 5),
                Text(notification.message,
                    style: const TextStyle(
                        fontSize: 10, height: 1.5, color: TriSafeColors.muted)),
              ])),
        ]),
      ),
    );
  }
}

class _UpdatesEmpty extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  const _UpdatesEmpty(
      {required this.icon, required this.title, required this.message});
  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.fromLTRB(18, 30, 18, 112), children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(children: [
              Icon(icon, size: 40, color: TriSafeColors.forest),
              const SizedBox(height: 12),
              Text(title,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w900)),
              const SizedBox(height: 5),
              Text(message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 10, color: TriSafeColors.muted)),
            ]),
          ),
        ),
      ]);
}

Future<void> showDriverAnnouncementDetails(
    BuildContext context, DriverAnnouncement announcement) async {
  await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                  22, 4, 22, 22 + MediaQuery.viewInsetsOf(context).bottom),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('OFFICIAL LGU ANNOUNCEMENT',
                        style: TextStyle(
                            color: TriSafeColors.forest,
                            fontSize: 9,
                            letterSpacing: 1.1,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 8),
                    Text(announcement.title,
                        style: const TextStyle(
                            fontSize: 21, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 7),
                    Text('Published ${_date(announcement.publishedAt)}',
                        style: const TextStyle(
                            fontSize: 10, color: TriSafeColors.muted)),
                    const Divider(height: 28),
                    if (announcement.imageData != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.memory(
                          base64Decode(announcement.imageData!.split(',').last),
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                      ),
                      const SizedBox(height: 18),
                    ],
                    Text(announcement.body,
                        style: const TextStyle(fontSize: 13, height: 1.6)),
                    if (announcement.expiresAt != null) ...[
                      const SizedBox(height: 18),
                      Text(
                          'Notice active until ${_date(announcement.expiresAt!)}',
                          style: const TextStyle(
                              fontSize: 10,
                              color: TriSafeColors.muted,
                              fontWeight: FontWeight.w700)),
                    ],
                    const SizedBox(height: 20),
                    SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Close announcement'))),
                  ]),
            ),
          ));
}

String _date(DateTime value) =>
    '${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')}/${value.year}';
