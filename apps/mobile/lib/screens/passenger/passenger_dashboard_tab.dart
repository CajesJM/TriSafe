import 'package:flutter/material.dart';

import '../../models/auth_models.dart';
import '../../models/ride_models.dart';
import '../../models/vehicle_models.dart';
import '../../styles/passenger/passenger_dashboard_styles.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger/passenger_dashboard_states.dart';
import '../../widgets/passenger/passenger_home_header.dart';
import '../../widgets/passenger/passenger_journey_overview.dart';
import '../../widgets/passenger/passenger_quick_actions.dart';
import '../../widgets/passenger/passenger_recent_rides.dart';
import '../../widgets/passenger/passenger_ride_safety_hero.dart';

class PassengerDashboardTab extends StatelessWidget {
  final PassengerProfile profile;
  final List<Ride> rides;
  final Ride? activeRide;
  final VerifiedVehicle? verifiedVehicle;
  final int reportCount;
  final int trustedContactCount;
  final bool loading;
  final VoidCallback onScan;
  final VoidCallback onOpenFare;
  final VoidCallback onContinueVerifiedRide;
  final VoidCallback onOpenRides;
  final VoidCallback onSos;
  final VoidCallback onShareRide;
  final VoidCallback onEndRide;
  final VoidCallback onChangePhoto;
  final VoidCallback onNotifications;
  final Future<void> Function() onRefresh;

  const PassengerDashboardTab({
    super.key,
    required this.profile,
    required this.rides,
    required this.activeRide,
    required this.verifiedVehicle,
    required this.reportCount,
    required this.trustedContactCount,
    required this.loading,
    required this.onScan,
    required this.onOpenFare,
    required this.onContinueVerifiedRide,
    required this.onOpenRides,
    required this.onSos,
    required this.onShareRide,
    required this.onEndRide,
    required this.onChangePhoto,
    required this.onNotifications,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final completed =
        rides.where((ride) => ride.status == 'COMPLETED').toList();
    final fareTotal = completed.fold<double>(
      0,
      (total, ride) => total + (ride.finalFare ?? ride.estimatedFare),
    );

    return Stack(
      children: [
        const _PassengerDashboardBackdrop(),
        RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: PassengerDashboardStyles.screenPadding,
            children: [
              PassengerHomeHeader(
                profile: profile,
                onChangePhoto: onChangePhoto,
                onNotifications: onNotifications,
              ),
              const SizedBox(height: 20),
              if (loading && rides.isEmpty)
                const PassengerDashboardLoading()
              else ...[
                PassengerRideSafetyHero(
                  activeRide: activeRide,
                  verifiedVehicle: verifiedVehicle,
                  onScan: onScan,
                  onOpenFare: onOpenFare,
                  onContinueRide: onContinueVerifiedRide,
                  onShareRide: onShareRide,
                  onSos: onSos,
                  onEndRide: onEndRide,
                ),
                const SizedBox(height: 22),
                const _SectionHeading(
                  title: 'Journey overview',
                  subtitle: 'Your personal TriSafe activity',
                ),
                const SizedBox(height: 11),
                PassengerJourneyOverview(
                  completedRides: completed.length,
                  totalFare: fareTotal,
                  reportCount: reportCount,
                  trustedContactCount: trustedContactCount,
                ),
                const SizedBox(height: 23),
                const _SectionHeading(
                  title: 'Quick actions',
                  subtitle: 'Essential travel and safety tools',
                ),
                const SizedBox(height: 11),
                PassengerQuickActions(
                  onScan: onScan,
                  onFare: onOpenFare,
                  onShare: onShareRide,
                  onSos: onSos,
                ),
                const SizedBox(height: 23),
                PassengerRecentRides(rides: rides, onViewAll: onOpenRides),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _PassengerDashboardBackdrop extends StatelessWidget {
  const _PassengerDashboardBackdrop();

  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: PassengerDashboardStyles.dashboardBackground,
          ),
          child: Stack(
            children: [
              Positioned(
                top: -120,
                right: -82,
                child: Container(
                  width: 255,
                  height: 255,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0x145dd62c),
                  ),
                ),
              ),
              Positioned(
                top: 410,
                left: -130,
                child: Container(
                  width: 240,
                  height: 240,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0x0b124f44),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

class _SectionHeading extends StatelessWidget {
  final String title;
  final String subtitle;

  const _SectionHeading({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: TriSafeColors.black,
                  fontSize: 17,
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
