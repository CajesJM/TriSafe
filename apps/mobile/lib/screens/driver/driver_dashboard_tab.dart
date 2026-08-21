import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../models/driver_rating_models.dart';
import '../../models/driver_violation_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';
import '../../widgets/driver_status_badge.dart';

class DriverDashboardTab extends StatelessWidget {
  final DriverProfile? profile;
  final List<DriverAnnouncement> announcements;
  final List<DriverNotification> notifications;
  final List<DriverViolationRecord> violations;
  final DriverRatingStatistics? ratingStatistics;
  final bool loading;
  final VoidCallback onRefresh;
  final VoidCallback onOpenFranchise;
  final VoidCallback onOpenNotifications;
  final VoidCallback onOpenViolations;
  final VoidCallback onOpenRatingStatistics;
  final ValueChanged<int> onOpenTab;

  const DriverDashboardTab({
    super.key,
    required this.profile,
    required this.announcements,
    required this.notifications,
    required this.violations,
    required this.ratingStatistics,
    required this.loading,
    required this.onRefresh,
    required this.onOpenFranchise,
    required this.onOpenNotifications,
    required this.onOpenViolations,
    required this.onOpenRatingStatistics,
    required this.onOpenTab,
  });

  @override
  Widget build(BuildContext context) {
    final driver = profile;
    final unreadNotifications =
        notifications.where((notification) => !notification.isRead).toList();
    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
        children: [
          DriverPageHeader(
            eyebrow: 'DRIVER PORTAL',
            title: driver == null
                ? 'Driver dashboard'
                : '${_timeGreeting(DateTime.now().hour)}, ${_firstName(driver.fullName)}',
            description:
                'Your LGU-verified transport records, reminders, and service updates.',
            action: Semantics(
              button: true,
              label: unreadNotifications.isEmpty
                  ? 'Open notifications'
                  : 'Open notifications, ${unreadNotifications.length} unread',
              child: IconButton(
                tooltip: 'Notifications',
                onPressed: onOpenNotifications,
                icon: Badge(
                  isLabelVisible: unreadNotifications.isNotEmpty,
                  label: Text(unreadNotifications.length > 9
                      ? '9+'
                      : '${unreadNotifications.length}'),
                  child: const Icon(Icons.notifications_none_rounded,
                      color: TriSafeColors.forest),
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),
          if (loading && driver == null)
            const _DashboardSkeleton()
          else if (driver != null) ...[
            _StatusHero(profile: driver, onOpenFranchise: onOpenFranchise),
            const SizedBox(height: 14),
            _RatingOverview(
              statistics: ratingStatistics,
              onOpen: onOpenRatingStatistics,
            ),
            const SizedBox(height: 14),
            LayoutBuilder(builder: (context, constraints) {
              final width = constraints.maxWidth >= 680
                  ? (constraints.maxWidth - 24) / 3
                  : (constraints.maxWidth - 12) / 2;
              return Wrap(spacing: 12, runSpacing: 12, children: [
                _MetricCard(
                    width: width,
                    icon: Icons.electric_rickshaw_rounded,
                    value: '${driver.vehicles.length}',
                    label: 'Registered vehicles',
                    detail: driver.vehicles.any((item) => item.isActive)
                        ? 'At least one active'
                        : 'No active vehicle'),
                _MetricCard(
                    width: width,
                    icon: Icons.notifications_active_outlined,
                    value: '${unreadNotifications.length}',
                    label: 'Important updates',
                    detail: unreadNotifications.isEmpty
                        ? 'You are up to date'
                        : 'Needs your attention'),
                _MetricCard(
                    width: width,
                    icon: Icons.campaign_outlined,
                    value:
                        '${announcements.where((item) => !item.isRead).length}',
                    label: 'Unread notices',
                    detail: '${announcements.length} active announcements'),
              ]);
            }),
            const SizedBox(height: 18),
            _QuickActions(
                onVehicle: () => onOpenTab(1),
                onQr: () => onOpenTab(2),
                onFranchise: onOpenFranchise,
                onProfile: () => onOpenTab(4)),
            const SizedBox(height: 18),
            _ComplianceShortcut(
              violations: violations,
              onOpen: onOpenViolations,
            ),
            const SizedBox(height: 18),
            _SectionTitle(
                title: 'Important reminders',
                action: 'View all',
                onTap: onOpenNotifications),
            const SizedBox(height: 10),
            if (unreadNotifications.isEmpty)
              const _EmptyCard(
                  icon: Icons.task_alt_rounded,
                  title: 'No urgent reminders',
                  message: 'Your account has no pending system alerts.')
            else
              ...unreadNotifications.take(2).map(_NotificationPreview.new),
            const SizedBox(height: 18),
            _SectionTitle(
                title: 'Latest LGU announcements',
                action: 'View all',
                onTap: () => onOpenTab(3)),
            const SizedBox(height: 10),
            if (announcements.isEmpty)
              const _EmptyCard(
                  icon: Icons.campaign_outlined,
                  title: 'No active announcements',
                  message: 'New LGU notices will appear here.')
            else
              ...announcements.take(2).map(_AnnouncementPreview.new),
          ],
        ],
      ),
    );
  }
}

class _ComplianceShortcut extends StatelessWidget {
  final List<DriverViolationRecord> violations;
  final VoidCallback onOpen;

  const _ComplianceShortcut({required this.violations, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final openCases = violations
        .where((item) => item.status == 'OPEN' || item.status == 'ACKNOWLEDGED')
        .length;
    final pendingPenalties =
        violations.where((item) => item.penaltyStatus == 'PENDING').length;
    return Card(
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Row(children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                  color: openCases > 0
                      ? const Color(0xffffece9)
                      : TriSafeColors.softGreen,
                  borderRadius: BorderRadius.circular(13)),
              child: Icon(Icons.gavel_outlined,
                  color: openCases > 0
                      ? TriSafeColors.danger
                      : TriSafeColors.forest),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Violations & penalties',
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(
                        openCases == 0
                            ? 'No open LGU compliance records'
                            : '$openCases open case${openCases == 1 ? '' : 's'} · $pendingPenalties pending penalty',
                        style: const TextStyle(
                            fontSize: 10, color: TriSafeColors.muted)),
                  ]),
            ),
            const Icon(Icons.chevron_right_rounded, color: TriSafeColors.muted),
          ]),
        ),
      ),
    );
  }
}

class _RatingOverview extends StatelessWidget {
  final DriverRatingStatistics? statistics;
  final VoidCallback onOpen;

  const _RatingOverview({required this.statistics, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final value = statistics?.average;
    final reviews = statistics?.totalReviews ?? 0;
    return Card(
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Row(children: [
            Container(
              width: 45,
              height: 45,
              decoration: BoxDecoration(
                  color: const Color(0xfffff1ca),
                  borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.star_rounded, color: Color(0xff966300)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Rating statistics',
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(
                      reviews == 0
                          ? 'No passenger reviews received yet'
                          : '${value?.toStringAsFixed(1) ?? '—'} average from $reviews passenger review${reviews == 1 ? '' : 's'}',
                      style: const TextStyle(
                          fontSize: 10, color: TriSafeColors.muted),
                    ),
                  ]),
            ),
            const Icon(Icons.chevron_right_rounded, color: TriSafeColors.muted),
          ]),
        ),
      ),
    );
  }
}

class _StatusHero extends StatelessWidget {
  final DriverProfile profile;
  final VoidCallback onOpenFranchise;
  const _StatusHero({required this.profile, required this.onOpenFranchise});

  @override
  Widget build(BuildContext context) {
    final franchise = profile.franchise;
    final verified = profile.verification == 'VERIFIED' &&
        franchise?.status == 'VERIFIED' &&
        profile.accountStatus == 'ACTIVE';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: verified ? TriSafeColors.black : const Color(0xff3a2927),
          borderRadius: BorderRadius.circular(22)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                  color:
                      verified ? TriSafeColors.lime : const Color(0xffffd8d2),
                  borderRadius: BorderRadius.circular(15)),
              child: Icon(
                  verified
                      ? Icons.verified_user_rounded
                      : Icons.gpp_bad_rounded,
                  color: TriSafeColors.black)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                const Text('TRANSPORT ELIGIBILITY',
                    style: TextStyle(
                        color: TriSafeColors.lime,
                        fontSize: 9,
                        letterSpacing: 1,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                Text(
                    verified ? 'Cleared for verified rides' : 'Action required',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w900)),
              ])),
          DriverStatusBadge(status: profile.verification, compact: true),
        ]),
        const SizedBox(height: 17),
        Text(
            franchise == null
                ? 'No franchise record is linked to this account.'
                : 'Franchise ${franchise.number} · valid until ${_date(franchise.expiresAt)}',
            style: const TextStyle(
                color: Color(0xffcbd1cb), fontSize: 11, height: 1.45)),
        const SizedBox(height: 14),
        OutlinedButton.icon(
            onPressed: onOpenFranchise,
            style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Color(0xff596159))),
            icon: const Icon(Icons.assignment_outlined, size: 18),
            label: const Text('View franchise details')),
      ]),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final double width;
  final IconData icon;
  final String value;
  final String label;
  final String detail;
  const _MetricCard(
      {required this.width,
      required this.icon,
      required this.value,
      required this.label,
      required this.detail});
  @override
  Widget build(BuildContext context) => SizedBox(
      width: width,
      child: Card(
          child: Padding(
              padding: const EdgeInsets.all(15),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, color: TriSafeColors.forest, size: 21),
                    const SizedBox(height: 12),
                    Text(value,
                        style: const TextStyle(
                            fontSize: 24, fontWeight: FontWeight.w900)),
                    Text(label,
                        style: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 3),
                    Text(detail,
                        style: const TextStyle(
                            fontSize: 9, color: TriSafeColors.muted)),
                  ]))));
}

class _QuickActions extends StatelessWidget {
  final VoidCallback onVehicle;
  final VoidCallback onQr;
  final VoidCallback onFranchise;
  final VoidCallback onProfile;
  const _QuickActions(
      {required this.onVehicle,
      required this.onQr,
      required this.onFranchise,
      required this.onProfile});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            _Action(
                icon: Icons.electric_rickshaw_rounded,
                label: 'Vehicle',
                onTap: onVehicle),
            _Action(icon: Icons.qr_code_2_rounded, label: 'My QR', onTap: onQr),
            _Action(
                icon: Icons.assignment_outlined,
                label: 'Franchise',
                onTap: onFranchise),
            _Action(
                icon: Icons.person_outline_rounded,
                label: 'Profile',
                onTap: onProfile),
          ])));
}

class _Action extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _Action({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => Expanded(
      child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(13),
          child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(children: [
                Container(
                    width: 39,
                    height: 39,
                    decoration: BoxDecoration(
                        color: TriSafeColors.softGreen,
                        borderRadius: BorderRadius.circular(12)),
                    child: Icon(icon, color: TriSafeColors.forest, size: 20)),
                const SizedBox(height: 6),
                Text(label,
                    style: const TextStyle(
                        fontSize: 9, fontWeight: FontWeight.w800)),
              ]))));
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String action;
  final VoidCallback onTap;
  const _SectionTitle(
      {required this.title, required this.action, required this.onTap});
  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(
            child: Text(title,
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w900))),
        TextButton(onPressed: onTap, child: Text(action)),
      ]);
}

class _NotificationPreview extends StatelessWidget {
  final DriverNotification notification;
  const _NotificationPreview(this.notification);
  @override
  Widget build(BuildContext context) => Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: ListTile(
          leading: CircleAvatar(
              backgroundColor: notification.priority == 'CRITICAL'
                  ? const Color(0xffffe8e6)
                  : const Color(0xfffff1cd),
              child: Icon(Icons.notifications_active_outlined,
                  color: notification.priority == 'CRITICAL'
                      ? TriSafeColors.danger
                      : const Color(0xff8a5a00),
                  size: 20)),
          title: Text(notification.title,
              style:
                  const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
          subtitle: Text(notification.message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10, height: 1.4))));
}

class _AnnouncementPreview extends StatelessWidget {
  final DriverAnnouncement announcement;
  const _AnnouncementPreview(this.announcement);
  @override
  Widget build(BuildContext context) => Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.campaign_outlined, color: TriSafeColors.forest),
            const SizedBox(width: 11),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Row(children: [
                    Expanded(
                        child: Text(announcement.title,
                            style: const TextStyle(
                                fontSize: 12, fontWeight: FontWeight.w900))),
                    if (!announcement.isRead)
                      Container(
                          width: 7,
                          height: 7,
                          decoration: const BoxDecoration(
                              color: TriSafeColors.lime,
                              shape: BoxShape.circle)),
                  ]),
                  const SizedBox(height: 4),
                  Text(announcement.body,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 10,
                          height: 1.4,
                          color: TriSafeColors.muted)),
                ])),
          ])));
}

class _EmptyCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  const _EmptyCard(
      {required this.icon, required this.title, required this.message});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(children: [
            Icon(icon, color: TriSafeColors.forest),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(title,
                      style: const TextStyle(fontWeight: FontWeight.w900)),
                  Text(message,
                      style: const TextStyle(
                          fontSize: 10, color: TriSafeColors.muted)),
                ])),
          ])));
}

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();
  @override
  Widget build(BuildContext context) => Column(
      children: List.generate(
          4,
          (index) => Container(
              height: index == 0 ? 170 : 92,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                  color: const Color(0xffe9ede7),
                  borderRadius: BorderRadius.circular(20)))));
}

String _timeGreeting(int hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

String _firstName(String fullName) {
  final commaParts = fullName.split(',');
  if (commaParts.length > 1) return commaParts[1].trim().split(' ').first;
  return fullName.trim().split(' ').first;
}

String _date(DateTime value) =>
    '${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')}/${value.year}';
