import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../models/driver_rating_models.dart';
import '../../models/driver_violation_models.dart';
import '../../styles/driver/driver_dashboard_styles.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_avatar.dart';
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
    return Stack(
      children: [
        const _DashboardBackdrop(),
        RefreshIndicator(
          onRefresh: () async => onRefresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: DriverDashboardStyles.screenPadding,
            children: [
              _DashboardHeader(
                profile: driver,
                unreadCount: unreadNotifications.length,
                onNotifications: onOpenNotifications,
              ),
              const SizedBox(height: 18),
              if (loading && driver == null)
                const _DashboardSkeleton()
              else if (driver != null) ...[
                _StatusHero(profile: driver, onOpenFranchise: onOpenFranchise),
                const SizedBox(height: 22),
                const _DashboardSectionHeading(
                  title: 'Today at a glance',
                  subtitle: 'Your current transport account activity',
                ),
                const SizedBox(height: 11),
                _OperationalOverview(
                  profile: driver,
                  unreadCount: unreadNotifications.length,
                  statistics: ratingStatistics,
                  onVehicle: () => onOpenTab(1),
                  onNotifications: onOpenNotifications,
                  onRating: onOpenRatingStatistics,
                ),
                const SizedBox(height: 23),
                const _DashboardSectionHeading(
                  title: 'Driver tools',
                  subtitle: 'Open your most-used verified records',
                ),
                const SizedBox(height: 11),
                _QuickActions(
                    onVehicle: () => onOpenTab(1),
                    onQr: () => onOpenTab(2),
                    onFranchise: onOpenFranchise,
                    onProfile: () => onOpenTab(4)),
                if (driver.renewalReminder?.trim().isNotEmpty == true) ...[
                  const SizedBox(height: 14),
                  _RenewalReminder(
                    message: driver.renewalReminder!.trim(),
                    onOpen: onOpenFranchise,
                  ),
                ],
                const SizedBox(height: 14),
                _ComplianceShortcut(
                  violations: violations,
                  onOpen: onOpenViolations,
                ),
                const SizedBox(height: 23),
                _SectionTitle(
                    title: 'Important reminders',
                    subtitle: unreadNotifications.isEmpty
                        ? 'No unread driver alerts'
                        : '${unreadNotifications.length} update${unreadNotifications.length == 1 ? '' : 's'} need your attention',
                    action: 'View all',
                    onTap: onOpenNotifications),
                const SizedBox(height: 10),
                if (unreadNotifications.isEmpty)
                  const _EmptyCard(
                      icon: Icons.task_alt_rounded,
                      title: 'You are up to date',
                      message: 'Your account has no pending system alerts.')
                else
                  ...unreadNotifications.take(2).map((item) =>
                      _NotificationPreview(item, onTap: onOpenNotifications)),
                const SizedBox(height: 23),
                _SectionTitle(
                    title: 'Latest LGU announcements',
                    subtitle: 'Official transport notices from your LGU',
                    action: 'View all',
                    onTap: () => onOpenTab(3)),
                const SizedBox(height: 10),
                if (announcements.isEmpty)
                  const _EmptyCard(
                      icon: Icons.campaign_outlined,
                      title: 'No active announcements',
                      message: 'New LGU notices will appear here.')
                else
                  ...announcements.take(2).map((item) =>
                      _AnnouncementPreview(item, onTap: () => onOpenTab(3))),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _DashboardBackdrop extends StatelessWidget {
  const _DashboardBackdrop();

  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xfff3f9f0),
                Color(0xfff8faf7),
                Color(0xfff1f6ef),
              ],
            ),
          ),
          child: Stack(children: [
            Positioned(
              top: -118,
              right: -84,
              child: Container(
                width: 252,
                height: 252,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0x145dd62c),
                ),
              ),
            ),
            Positioned(
              top: 520,
              left: -138,
              child: Container(
                width: 248,
                height: 248,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0x0c124f44),
                ),
              ),
            ),
          ]),
        ),
      );
}

class _DashboardHeader extends StatelessWidget {
  final DriverProfile? profile;
  final int unreadCount;
  final VoidCallback onNotifications;

  const _DashboardHeader({
    required this.profile,
    required this.unreadCount,
    required this.onNotifications,
  });

  @override
  Widget build(BuildContext context) {
    final driver = profile;
    final name = driver == null ? 'Driver' : _firstName(driver.fullName);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xfffcfffb), Color(0xffe6f4df)],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xffd3e6cd)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x120d2d17),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Row(children: [
        DriverAvatar(
          fullName: driver?.fullName ?? 'Driver',
          avatarData: driver?.avatarData,
          radius: 27,
        ),
        const SizedBox(width: 13),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_timeGreeting(DateTime.now().hour)},',
                style: const TextStyle(
                  fontSize: 10,
                  color: TriSafeColors.forest,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .3,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 21,
                  height: 1.1,
                  color: TriSafeColors.black,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Your verified driver workspace',
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted),
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Semantics(
          button: true,
          label: unreadCount == 0
              ? 'Open driver notifications'
              : 'Open driver notifications, $unreadCount unread',
          child: IconButton(
            tooltip: 'Driver notifications',
            onPressed: onNotifications,
            style: IconButton.styleFrom(
              minimumSize: const Size.square(48),
              backgroundColor: TriSafeColors.black,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(15),
              ),
            ),
            icon: Badge(
              isLabelVisible: unreadCount > 0,
              label: Text(unreadCount > 9 ? '9+' : '$unreadCount'),
              backgroundColor: TriSafeColors.lime,
              textColor: TriSafeColors.black,
              child: const Icon(Icons.notifications_none_rounded, size: 23),
            ),
          ),
        ),
      ]),
    );
  }
}

class _DashboardSectionHeading extends StatelessWidget {
  final String title;
  final String subtitle;

  const _DashboardSectionHeading({
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 17,
                  color: TriSafeColors.black,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(subtitle,
              style: const TextStyle(
                  fontSize: 10,
                  color: TriSafeColors.muted,
                  fontWeight: FontWeight.w500)),
        ],
      );
}

class _OperationalOverview extends StatelessWidget {
  final DriverProfile profile;
  final int unreadCount;
  final DriverRatingStatistics? statistics;
  final VoidCallback onVehicle;
  final VoidCallback onNotifications;
  final VoidCallback onRating;

  const _OperationalOverview({
    required this.profile,
    required this.unreadCount,
    required this.statistics,
    required this.onVehicle,
    required this.onNotifications,
    required this.onRating,
  });

  @override
  Widget build(BuildContext context) {
    final activeVehicles =
        profile.vehicles.where((item) => item.isActive).length;
    final rating = statistics?.average;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _SnapshotCard(
            icon: Icons.electric_rickshaw_rounded,
            value: '$activeVehicles',
            label: 'Active\nvehicles',
            accent: TriSafeColors.forest,
            onTap: onVehicle,
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: _SnapshotCard(
            icon: Icons.star_rounded,
            value: rating == null ? '—' : rating.toStringAsFixed(1),
            label: 'Driver\nrating',
            accent: const Color(0xffa36b00),
            onTap: onRating,
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: _SnapshotCard(
            icon: Icons.notifications_active_outlined,
            value: '$unreadCount',
            label: 'Unread\nupdates',
            accent: unreadCount > 0
                ? const Color(0xffb54832)
                : TriSafeColors.forest,
            onTap: onNotifications,
          ),
        ),
      ],
    );
  }
}

class _SnapshotCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color accent;
  final VoidCallback onTap;

  const _SnapshotCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.accent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: '${label.replaceAll('\n', ' ')}: $value',
        child: Material(
          color: Colors.white.withValues(alpha: .94),
          borderRadius: BorderRadius.circular(19),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(19),
            child: Container(
              constraints: const BoxConstraints(minHeight: 126),
              padding: const EdgeInsets.fromLTRB(12, 13, 10, 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(19),
                border: Border.all(color: const Color(0xffdfe7dc)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: .10),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: Icon(icon, size: 18, color: accent),
                  ),
                  const Spacer(),
                  Text(value,
                      style: const TextStyle(
                          fontSize: 22,
                          height: 1,
                          color: TriSafeColors.black,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text(label,
                      style: const TextStyle(
                          fontSize: 9.5,
                          height: 1.25,
                          color: TriSafeColors.muted,
                          fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
        ),
      );
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
    final daysRemaining =
        franchise?.expiresAt.difference(DateTime.now()).inDays;
    return Semantics(
      container: true,
      label: verified
          ? 'Transport eligibility cleared for verified rides'
          : 'Transport eligibility requires action',
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: verified
                ? const [Color(0xff101712), Color(0xff173c28)]
                : const [Color(0xff3d2926), Color(0xff6b332b)],
          ),
          borderRadius: BorderRadius.circular(26),
          boxShadow: const [
            BoxShadow(
              color: Color(0x28122819),
              blurRadius: 26,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: Stack(children: [
          Positioned(
            right: -28,
            top: -34,
            child: Icon(
              Icons.verified_user_outlined,
              size: 158,
              color: Colors.white.withValues(alpha: .055),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: verified
                          ? TriSafeColors.lime
                          : const Color(0xffffd8d2),
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: Icon(
                      verified
                          ? Icons.verified_user_rounded
                          : Icons.gpp_bad_rounded,
                      color: TriSafeColors.black,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          verified ? 'READY FOR SERVICE' : 'ACTION REQUIRED',
                          style: TextStyle(
                            color: verified
                                ? TriSafeColors.lime
                                : const Color(0xffffc9c1),
                            fontSize: 9,
                            letterSpacing: 1.25,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          verified
                              ? 'Cleared for verified rides'
                              : 'Review your transport record',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            height: 1.15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                  DriverStatusBadge(
                      status: profile.verification, compact: true),
                ]),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .07),
                    borderRadius: BorderRadius.circular(17),
                    border:
                        Border.all(color: Colors.white.withValues(alpha: .10)),
                  ),
                  child: franchise == null
                      ? const _HeroDetailRow(
                          icon: Icons.assignment_late_outlined,
                          label: 'Franchise record',
                          value: 'No franchise linked',
                        )
                      : Column(children: [
                          _HeroDetailRow(
                            icon: Icons.assignment_outlined,
                            label: 'Franchise number',
                            value: franchise.number,
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 11),
                            child: Divider(height: 1, color: Color(0x24ffffff)),
                          ),
                          _HeroDetailRow(
                            icon: Icons.event_available_outlined,
                            label: 'Valid until',
                            value: _date(franchise.expiresAt),
                            trailing: daysRemaining == null
                                ? null
                                : daysRemaining < 0
                                    ? 'Expired'
                                    : '$daysRemaining days',
                          ),
                        ]),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton.icon(
                    onPressed: onOpenFranchise,
                    style: FilledButton.styleFrom(
                      backgroundColor: verified
                          ? TriSafeColors.lime
                          : const Color(0xffffd8d2),
                      foregroundColor: TriSafeColors.black,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.assignment_outlined, size: 18),
                    label: const Text('View franchise details'),
                  ),
                ),
              ],
            ),
          ),
        ]),
      ),
    );
  }
}

class _HeroDetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? trailing;

  const _HeroDetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) => Row(children: [
        Icon(icon, color: const Color(0xffb7c3b9), size: 19),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      color: Color(0xffaeb9b0),
                      fontSize: 9,
                      fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
            ],
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: 8),
          Text(trailing!,
              style: const TextStyle(
                  color: TriSafeColors.lime,
                  fontSize: 10,
                  fontWeight: FontWeight.w900)),
        ],
      ]);
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
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final width = (constraints.maxWidth - 10) / 2;
          return Wrap(spacing: 10, runSpacing: 10, children: [
            _Action(
              width: width,
              icon: Icons.electric_rickshaw_rounded,
              label: 'Vehicle record',
              detail: 'Registration and status',
              onTap: onVehicle,
            ),
            _Action(
              width: width,
              icon: Icons.qr_code_2_rounded,
              label: 'Show my QR',
              detail: 'Passenger verification',
              featured: true,
              onTap: onQr,
            ),
            _Action(
              width: width,
              icon: Icons.assignment_outlined,
              label: 'Franchise',
              detail: 'Validity and renewal',
              onTap: onFranchise,
            ),
            _Action(
              width: width,
              icon: Icons.person_outline_rounded,
              label: 'My profile',
              detail: 'Contact information',
              onTap: onProfile,
            ),
          ]);
        },
      );
}

class _Action extends StatelessWidget {
  final double width;
  final IconData icon;
  final String label;
  final String detail;
  final bool featured;
  final VoidCallback onTap;
  const _Action({
    required this.width,
    required this.icon,
    required this.label,
    required this.detail,
    required this.onTap,
    this.featured = false,
  });

  @override
  Widget build(BuildContext context) => SizedBox(
        width: width,
        child: Semantics(
          button: true,
          label: '$label. $detail',
          child: Material(
            color: featured ? TriSafeColors.deepGreen : Colors.white,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(18),
              child: Container(
                constraints: const BoxConstraints(minHeight: 92),
                padding: const EdgeInsets.all(13),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: featured
                        ? TriSafeColors.deepGreen
                        : const Color(0xffdfe7dc),
                  ),
                ),
                child: Row(children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: featured
                          ? TriSafeColors.lime
                          : TriSafeColors.softGreen,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Icon(icon,
                        color: featured
                            ? TriSafeColors.black
                            : TriSafeColors.forest,
                        size: 21),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 11,
                                color: featured
                                    ? Colors.white
                                    : TriSafeColors.black,
                                fontWeight: FontWeight.w900)),
                        const SizedBox(height: 3),
                        Text(detail,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 8.5,
                                height: 1.25,
                                color: featured
                                    ? const Color(0xffc9d6cc)
                                    : TriSafeColors.muted)),
                      ],
                    ),
                  ),
                ]),
              ),
            ),
          ),
        ),
      );
}

class _RenewalReminder extends StatelessWidget {
  final String message;
  final VoidCallback onOpen;

  const _RenewalReminder({required this.message, required this.onOpen});

  @override
  Widget build(BuildContext context) => Material(
        color: const Color(0xfffff7e5),
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xffefd8a4)),
            ),
            child: Row(children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xffffe9b8),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(Icons.event_repeat_rounded,
                    color: Color(0xff8a5a00), size: 21),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Renewal reminder',
                        style: TextStyle(
                            fontSize: 12,
                            color: Color(0xff6c4700),
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(message,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 10,
                            height: 1.35,
                            color: Color(0xff765e31))),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Color(0xff8a6a25)),
            ]),
          ),
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String subtitle;
  final String action;
  final VoidCallback onTap;
  const _SectionTitle(
      {required this.title,
      required this.subtitle,
      required this.action,
      required this.onTap});
  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 16,
                        color: TriSafeColors.black,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                Text(subtitle,
                    style: const TextStyle(
                        fontSize: 9.5, color: TriSafeColors.muted)),
              ],
            ),
          ),
          TextButton(onPressed: onTap, child: Text(action)),
        ],
      );
}

class _NotificationPreview extends StatelessWidget {
  final DriverNotification notification;
  final VoidCallback onTap;
  const _NotificationPreview(this.notification, {required this.onTap});
  @override
  Widget build(BuildContext context) => Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: ListTile(
          onTap: onTap,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
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
          subtitle: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(notification.message,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 10, height: 1.4, color: TriSafeColors.muted))),
          trailing: const Icon(Icons.chevron_right_rounded,
              color: TriSafeColors.muted)));
}

class _AnnouncementPreview extends StatelessWidget {
  final DriverAnnouncement announcement;
  final VoidCallback onTap;
  const _AnnouncementPreview(this.announcement, {required this.onTap});
  @override
  Widget build(BuildContext context) => Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                      color: TriSafeColors.softGreen,
                      borderRadius: BorderRadius.circular(13)),
                  child: const Icon(Icons.campaign_outlined,
                      size: 20, color: TriSafeColors.forest)),
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
              const SizedBox(width: 5),
              const Icon(Icons.chevron_right_rounded,
                  color: TriSafeColors.muted),
            ])),
      ));
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

String _date(DateTime value) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${months[value.month - 1]} ${value.day}, ${value.year}';
}
