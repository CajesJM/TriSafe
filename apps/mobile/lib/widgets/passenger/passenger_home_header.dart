import 'package:flutter/material.dart';

import '../../models/auth_models.dart';
import '../../models/ride_models.dart';
import '../../styles/passenger/passenger_dashboard_styles.dart';
import '../../theme/trisafe_theme.dart';
import '../driver_avatar.dart';

class PassengerHomeHeader extends StatelessWidget {
  final PassengerProfile profile;
  final VoidCallback onChangePhoto;
  final VoidCallback onNotifications;

  const PassengerHomeHeader({
    super.key,
    required this.profile,
    required this.onChangePhoto,
    required this.onNotifications,
  });

  @override
  Widget build(BuildContext context) {
    final accountName = profile.username?.trim().isNotEmpty == true
        ? profile.username!.trim()
        : _firstName(profile.fullName);
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 14, 16),
      decoration: PassengerDashboardStyles.greetingSurfaceDecoration,
      child: Stack(
        children: [
          const Positioned(
            left: -24,
            bottom: -46,
            child: Icon(Icons.verified_user_outlined,
                size: 132, color: Color(0x103d941b)),
          ),
          Positioned(
            right: 1,
            bottom: 1,
            child: Text(
              _compactDate(DateTime.now()),
              style: const TextStyle(
                color: TriSafeColors.muted,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: .25,
              ),
            ),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 9, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xffdff5d7),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        _greeting(DateTime.now().hour).toUpperCase(),
                        style: const TextStyle(
                          color: TriSafeColors.forest,
                          fontSize: 9,
                          letterSpacing: 1.05,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(accountName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: TriSafeColors.black,
                            fontSize: 27,
                            height: 1.1,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 7),
                    const Text('Your verified transport tools are ready.',
                        style: TextStyle(
                            color: TriSafeColors.charcoal,
                            fontSize: 12,
                            height: 1.35)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                onPressed: onNotifications,
                tooltip: 'Notifications',
                style: IconButton.styleFrom(
                  foregroundColor: TriSafeColors.forest,
                  backgroundColor: Colors.white,
                  fixedSize: const Size(42, 42),
                  side: const BorderSide(color: Color(0xffd5e8ce)),
                ),
                icon: const Icon(Icons.notifications_none_rounded),
              ),
              const SizedBox(width: 10),
              Semantics(
                button: true,
                label: 'Choose profile photo',
                child: InkWell(
                  onTap: onChangePhoto,
                  borderRadius: BorderRadius.circular(28),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      DriverAvatar(
                        fullName: profile.fullName,
                        avatarData: profile.avatarData,
                        radius: 24,
                      ),
                      Positioned(
                        right: -2,
                        bottom: -2,
                        child: Container(
                          width: 21,
                          height: 21,
                          decoration: BoxDecoration(
                            color: TriSafeColors.lime,
                            border: Border.all(color: Colors.white, width: 2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt_outlined,
                              size: 12, color: TriSafeColors.black),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Reserved header-stat presentation for a future compact dashboard variant.
class PassengerHeaderStatCard extends StatelessWidget {
  final int type;
  final String accountName;
  final int completedRides;
  final double fareTotal;
  final Ride? activeRide;
  final int reportCount;
  final int trustedContactCount;

  const PassengerHeaderStatCard({
    super.key,
    required this.type,
    required this.accountName,
    required this.completedRides,
    required this.fareTotal,
    required this.activeRide,
    required this.reportCount,
    required this.trustedContactCount,
  });

  @override
  Widget build(BuildContext context) {
    switch (type) {
      case 1:
        return _rideActivityCard();
      case 2:
        return _safetyNetworkCard();
      case 3:
        return _accountCard();
      default:
        return _greetingCard();
    }
  }

  Widget _greetingCard() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Pill(label: _greeting(DateTime.now().hour).toUpperCase()),
          const SizedBox(height: 10),
          Text(accountName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: TriSafeColors.black,
                  fontSize: 27,
                  height: 1.1,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          const Text('Your verified transport tools are ready.',
              style: TextStyle(
                  color: TriSafeColors.charcoal, fontSize: 12, height: 1.35)),
        ],
      );

  Widget _rideActivityCard() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Pill(label: 'RIDE ACTIVITY', icon: Icons.route_rounded),
          const SizedBox(height: 10),
          Row(children: [
            _StatValue(value: '$completedRides', label: 'completed rides'),
            Container(width: 1, height: 35, color: const Color(0xffc9ddc2)),
            const SizedBox(width: 14),
            _StatValue(
                value: '₱${fareTotal.toStringAsFixed(0)}',
                label: 'official fares'),
          ]),
          const SizedBox(height: 8),
          Text(
              activeRide == null
                  ? 'Your personal journey record is up to date.'
                  : 'A verified ride is currently active.',
              style:
                  const TextStyle(color: TriSafeColors.charcoal, fontSize: 11)),
        ],
      );

  Widget _safetyNetworkCard() => Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: const Color(0xffdff5d7),
              borderRadius: BorderRadius.circular(17),
            ),
            child: const Icon(Icons.shield_outlined,
                color: TriSafeColors.forest, size: 28),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Safety network',
                    style: TextStyle(
                        color: TriSafeColors.black,
                        fontSize: 17,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                Text(
                    '$trustedContactCount trusted contacts · $reportCount reports',
                    style: const TextStyle(
                        color: TriSafeColors.charcoal, fontSize: 11)),
                const SizedBox(height: 8),
                const LinearProgressIndicator(
                  minHeight: 5,
                  value: 1,
                  color: TriSafeColors.forest,
                  backgroundColor: Color(0xffcce8c4),
                  borderRadius: BorderRadius.all(Radius.circular(99)),
                ),
              ],
            ),
          ),
        ],
      );

  Widget _accountCard() => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xff165647),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(children: [
          const Icon(Icons.verified_user_rounded,
              color: TriSafeColors.lime, size: 28),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('TriSafe account verified',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w900)),
                SizedBox(height: 3),
                Text('Official QR checks and fare tools are available.',
                    style: TextStyle(
                        color: Color(0xffe6f7df), fontSize: 10, height: 1.3)),
              ],
            ),
          ),
        ]),
      );
}

class _Pill extends StatelessWidget {
  final String label;
  final IconData? icon;

  const _Pill({required this.label, this.icon});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xffdff5d7),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: TriSafeColors.forest),
            const SizedBox(width: 4),
          ],
          Text(label,
              style: const TextStyle(
                  color: TriSafeColors.forest,
                  fontSize: 9,
                  letterSpacing: 1.05,
                  fontWeight: FontWeight.w900)),
        ]),
      );
}

class _StatValue extends StatelessWidget {
  final String value;
  final String label;

  const _StatValue({required this.value, required this.label});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(right: 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value,
              style: const TextStyle(
                  color: TriSafeColors.black,
                  fontSize: 21,
                  height: 1,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(label,
              style:
                  const TextStyle(color: TriSafeColors.charcoal, fontSize: 10)),
        ]),
      );
}

String _firstName(String fullName) {
  final afterComma = fullName.contains(',')
      ? fullName.split(',').last.trim()
      : fullName.trim();
  return afterComma.split(RegExp(r'\s+')).first;
}

String _greeting(int hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

String _compactDate(DateTime date) {
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  final year = (date.year % 100).toString().padLeft(2, '0');
  return '$day/$month/$year';
}
