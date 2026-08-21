import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';

/// Driver-facing account and renewal alerts. Announcement messages live in
/// their own bottom-navigation tab so the two communication types stay clear.
class DriverNotificationsScreen extends StatefulWidget {
  final List<DriverNotification> notifications;
  final Future<void> Function(String) onMarkRead;
  final Future<void> Function() onMarkAllRead;

  const DriverNotificationsScreen({
    super.key,
    required this.notifications,
    required this.onMarkRead,
    required this.onMarkAllRead,
  });

  @override
  State<DriverNotificationsScreen> createState() =>
      _DriverNotificationsScreenState();
}

class _DriverNotificationsScreenState extends State<DriverNotificationsScreen> {
  late List<DriverNotification> _notifications;

  @override
  void initState() {
    super.initState();
    _notifications = [...widget.notifications];
  }

  Future<void> _markRead(DriverNotification notification) async {
    try {
      await widget.onMarkRead(notification.id);
      if (!mounted) return;
      setState(() {
        _notifications = _notifications
            .map(
                (item) => item.id == notification.id ? item.markAsRead() : item)
            .toList();
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Notification could not be marked as read.')),
      );
    }
  }

  Future<void> _markAllRead() async {
    try {
      await widget.onMarkAllRead();
      if (!mounted) return;
      setState(() => _notifications =
          _notifications.map((item) => item.markAsRead()).toList());
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Notifications could not be marked as read.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = _notifications.where((item) => !item.isRead).length;
    return Scaffold(
      backgroundColor: TriSafeColors.offWhite,
      appBar: AppBar(title: const Text('Notifications')),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
          children: [
            DriverPageHeader(
              eyebrow: 'ACCOUNT ALERTS',
              title: 'Notifications',
              description: unread == 0
                  ? 'You are up to date with your TriSafe account.'
                  : '$unread unread account alert${unread == 1 ? '' : 's'} need your attention.',
            ),
            if (unread > 0)
              Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                      onPressed: _markAllRead,
                      icon: const Icon(Icons.done_all_rounded, size: 18),
                      label: const Text('Mark all as read'))),
            const SizedBox(height: 18),
            if (_notifications.isEmpty)
              const _EmptyNotifications()
            else
              ..._notifications.map(
                (notification) => _NotificationCard(
                    notification: notification,
                    onMarkRead: () => _markRead(notification)),
              ),
          ],
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final DriverNotification notification;
  final Future<void> Function() onMarkRead;

  const _NotificationCard(
      {required this.notification, required this.onMarkRead});

  @override
  Widget build(BuildContext context) {
    final style = switch (notification.priority) {
      'CRITICAL' => (
          color: TriSafeColors.danger,
          background: const Color(0xffffece9),
          icon: Icons.error_outline_rounded,
        ),
      'WARNING' => (
          color: const Color(0xff8a5a00),
          background: const Color(0xfffff4d9),
          icon: Icons.notification_important_outlined,
        ),
      _ => (
          color: TriSafeColors.forest,
          background: TriSafeColors.softGreen,
          icon: Icons.info_outline_rounded,
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
              color: style.background,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(style.icon, color: style.color, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(notification.title,
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w900)),
                ),
                Text(notification.priority,
                    style: TextStyle(
                        color: style.color,
                        fontSize: 8,
                        letterSpacing: .7,
                        fontWeight: FontWeight.w900)),
              ]),
              const SizedBox(height: 5),
              Text(notification.message,
                  style: const TextStyle(
                      fontSize: 10, height: 1.5, color: TriSafeColors.muted)),
              const SizedBox(height: 9),
              Row(children: [
                Expanded(
                    child: Text(_dateTime(notification.createdAt),
                        style: const TextStyle(
                            color: TriSafeColors.muted,
                            fontSize: 9,
                            fontWeight: FontWeight.w700))),
                if (!notification.isRead)
                  TextButton(
                      onPressed: onMarkRead, child: const Text('Mark read'))
                else
                  const Text('Read',
                      style: TextStyle(
                          color: TriSafeColors.muted,
                          fontSize: 9,
                          fontWeight: FontWeight.w700))
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _EmptyNotifications extends StatelessWidget {
  const _EmptyNotifications();

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(children: const [
            Icon(Icons.task_alt_rounded, size: 42, color: TriSafeColors.forest),
            SizedBox(height: 12),
            Text('You are all caught up',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            SizedBox(height: 6),
            Text(
                'Important franchise, vehicle, and account alerts will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ]),
        ),
      );
}

String _dateTime(DateTime date) =>
    '${date.month}/${date.day}/${date.year} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
