import 'package:flutter/material.dart';

import '../../theme/trisafe_theme.dart';

/// A dedicated notifications surface. It intentionally remains useful when
/// the account has no alerts, rather than leaving the bell without feedback.
Future<void> showPassengerNotificationsSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    backgroundColor: TriSafeColors.offWhite,
    builder: (sheetContext) => SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 4, 22, 22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: TriSafeColors.softGreen,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.notifications_none_rounded,
                      color: TriSafeColors.forest),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Notifications',
                          style: TextStyle(
                              fontSize: 19, fontWeight: FontWeight.w900)),
                      SizedBox(height: 2),
                      Text('Your passenger updates in one place',
                          style: TextStyle(
                              fontSize: 11, color: TriSafeColors.muted)),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(sheetContext),
                  tooltip: 'Close notifications',
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 27),
            Container(
              width: 76,
              height: 76,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xffe3f7dc),
              ),
              child: const Icon(Icons.notifications_paused_outlined,
                  size: 34, color: TriSafeColors.forest),
            ),
            const SizedBox(height: 16),
            const Text('All caught up',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 7),
            const Text(
              'No new notifications right now. Ride updates, LGU notices, and report status changes will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 12, height: 1.45, color: TriSafeColors.muted),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(sheetContext),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
