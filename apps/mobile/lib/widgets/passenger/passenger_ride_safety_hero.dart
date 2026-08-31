import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/ride_models.dart';
import '../../models/vehicle_models.dart';
import '../../theme/trisafe_theme.dart';

class PassengerRideSafetyHero extends StatelessWidget {
  final Ride? activeRide;
  final VerifiedVehicle? verifiedVehicle;
  final VoidCallback onScan;
  final VoidCallback onOpenFare;
  final VoidCallback onContinueRide;
  final VoidCallback onShareRide;
  final VoidCallback onSos;
  final VoidCallback onEndRide;
  final VoidCallback onReport;

  const PassengerRideSafetyHero({
    super.key,
    required this.activeRide,
    required this.verifiedVehicle,
    required this.onScan,
    required this.onOpenFare,
    required this.onContinueRide,
    required this.onShareRide,
    required this.onSos,
    required this.onEndRide,
    required this.onReport,
  });

  @override
  Widget build(BuildContext context) {
    if (activeRide != null) {
      return _ActiveRideHero(
        ride: activeRide!,
        onShareRide: onShareRide,
        onSos: onSos,
        onEndRide: onEndRide,
        onReport: onReport,
      );
    }
    if (verifiedVehicle != null) {
      return _VerifiedVehicleHero(
        vehicle: verifiedVehicle!,
        onContinueRide: onContinueRide,
        onScan: onScan,
      );
    }
    return _PassengerHeroCarousel(
      onScan: onScan,
      onOpenFare: onOpenFare,
      onSos: onSos,
    );
  }
}

/// Reusable static version of the pre-ride safety panel.
class ReadyToRideHero extends StatelessWidget {
  final VoidCallback onScan;
  final VoidCallback onOpenFare;

  const ReadyToRideHero({
    super.key,
    required this.onScan,
    required this.onOpenFare,
  });

  @override
  Widget build(BuildContext context) => _HeroSurface(
        label: 'RIDE SAFETY',
        icon: Icons.shield_outlined,
        title: 'Ready for a safer trip?',
        message:
            'Scan the official TriSafe QR before entering a vehicle to verify its LGU record.',
        primaryLabel: 'Scan driver QR',
        primaryIcon: Icons.qr_code_scanner_rounded,
        onPrimary: onScan,
        secondaryLabel: 'Fare estimate',
        secondaryIcon: Icons.payments_outlined,
        onSecondary: onOpenFare,
      );
}

/// Rotating hero content is shown only before a ride has started and before a
/// vehicle is verified. Once either state exists, TriSafe keeps the more
/// important verified-driver or active-ride panel stable on screen.
class _PassengerHeroCarousel extends StatefulWidget {
  final VoidCallback onScan;
  final VoidCallback onOpenFare;
  final VoidCallback onSos;

  const _PassengerHeroCarousel({
    required this.onScan,
    required this.onOpenFare,
    required this.onSos,
  });

  @override
  State<_PassengerHeroCarousel> createState() => _PassengerHeroCarouselState();
}

class _PassengerHeroCarouselState extends State<_PassengerHeroCarousel> {
  Timer? _timer;
  PageController? _pageController;
  bool _autoAdvanceConfigured = false;
  int _index = 0;

  PageController get _controller => _pageController ??= PageController();

  @override
  void initState() {
    super.initState();
    _controller;
    _startAutoAdvance();
  }

  void _startAutoAdvance() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted || !_controller.hasClients) return;
      final next = (_index + 1) % 4;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 520),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Existing State objects survive hot reload. Schedule the timer here once
    // as well, so a newly added controller is safe on an already running app.
    if (!_autoAdvanceConfigured) {
      _autoAdvanceConfigured = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _startAutoAdvance();
      });
    }
    final slides = [
      _scanSlide(),
      _fareSlide(),
      _scanResultSlide(),
      _safetySlide(),
    ];
    return Container(
      height: 248,
      padding: const EdgeInsets.all(20),
      decoration: _heroDecoration,
      child: Stack(children: [
        const Positioned(
          right: -30,
          top: -35,
          child:
              Icon(Icons.shield_outlined, size: 156, color: Color(0x20ffffff)),
        ),
        Column(children: [
          Expanded(
            child: Listener(
              onPointerDown: (_) => _startAutoAdvance(),
              child: PageView.builder(
                controller: _controller,
                itemCount: slides.length,
                onPageChanged: (page) => setState(() => _index = page),
                itemBuilder: (_, index) => Padding(
                  padding: const EdgeInsets.only(right: 2),
                  child: slides[index],
                ),
              ),
            ),
          ),
          const SizedBox(height: 7),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              slides.length,
              (index) => AnimatedContainer(
                duration: const Duration(milliseconds: 260),
                width: index == _index ? 18 : 5,
                height: 5,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: index == _index
                      ? TriSafeColors.lime
                      : Colors.white.withValues(alpha: .35),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _scanSlide() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _HeroLabel(icon: Icons.shield_outlined, text: 'RIDE SAFETY'),
          const SizedBox(height: 14),
          const Text('Ready for a safer trip?',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          const Text(
              'Verify the official TriSafe QR before entering a vehicle.',
              style: TextStyle(
                  color: Color(0xffe4eee2), fontSize: 12, height: 1.4)),
          const Spacer(),
          _heroActionRow(
            primaryLabel: 'Scan driver QR',
            primaryIcon: Icons.qr_code_scanner_rounded,
            onPrimary: widget.onScan,
            secondaryLabel: 'Fare estimate',
            secondaryIcon: Icons.payments_outlined,
            onSecondary: widget.onOpenFare,
          ),
        ],
      );

  Widget _fareSlide() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _HeroLabel(
              icon: Icons.payments_outlined, text: 'FARE TRANSPARENCY'),
          const SizedBox(height: 14),
          const Text('Know the official fare first',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          const Text(
              'Select your destination to estimate the fare from the active LGU matrix and road-route distance.',
              style: TextStyle(
                  color: Color(0xffe4eee2), fontSize: 12, height: 1.4)),
          const Spacer(),
          _heroActionRow(
            primaryLabel: 'Estimate fare',
            primaryIcon: Icons.map_outlined,
            onPrimary: widget.onOpenFare,
            secondaryLabel: 'Scan driver QR',
            secondaryIcon: Icons.qr_code_scanner_rounded,
            onSecondary: widget.onScan,
          ),
        ],
      );

  Widget _scanResultSlide() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _HeroLabel(
              icon: Icons.fact_check_outlined, text: 'WHAT WE VERIFY'),
          const SizedBox(height: 14),
          const Text('Check the vehicle record',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          const Text(
              'A legitimate LGU QR shows the approved driver, vehicle, identifier, franchise status, account status, and rating.',
              style: TextStyle(
                  color: Color(0xffe4eee2), fontSize: 12, height: 1.4)),
          const Spacer(),
          _heroActionRow(
            primaryLabel: 'Open QR scanner',
            primaryIcon: Icons.qr_code_scanner_rounded,
            onPrimary: widget.onScan,
            secondaryLabel: 'Estimate fare',
            secondaryIcon: Icons.payments_outlined,
            onSecondary: widget.onOpenFare,
          ),
        ],
      );

  Widget _safetySlide() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _HeroLabel(
              icon: Icons.health_and_safety_outlined, text: 'SAFETY TOOLS'),
          const SizedBox(height: 14),
          const Text('Prepare your safety tools',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          const Text(
              'Set trusted contacts before traveling. During a verified ride, SafeShare and SOS can send your ride details for help.',
              style: TextStyle(
                  color: Color(0xffe4eee2), fontSize: 12, height: 1.4)),
          const Spacer(),
          _heroActionRow(
            primaryLabel: 'SOS & contacts',
            primaryIcon: Icons.sos_outlined,
            onPrimary: widget.onSos,
            secondaryLabel: 'Scan driver QR',
            secondaryIcon: Icons.qr_code_scanner_rounded,
            onSecondary: widget.onScan,
          ),
        ],
      );

  Widget _heroActionRow({
    required String primaryLabel,
    required IconData primaryIcon,
    required VoidCallback onPrimary,
    required String secondaryLabel,
    required IconData secondaryIcon,
    required VoidCallback onSecondary,
  }) =>
      Row(children: [
        Expanded(
          child: FilledButton.icon(
            onPressed: onPrimary,
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 48),
              backgroundColor: TriSafeColors.lime,
              foregroundColor: TriSafeColors.black,
            ),
            icon: Icon(primaryIcon, size: 19),
            label: Text(primaryLabel, overflow: TextOverflow.ellipsis),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onSecondary,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 48),
              foregroundColor: Colors.white,
              side: BorderSide(color: Colors.white.withValues(alpha: .42)),
            ),
            icon: Icon(secondaryIcon, size: 18),
            label: Text(secondaryLabel, overflow: TextOverflow.ellipsis),
          ),
        ),
      ]);
}

class _VerifiedVehicleHero extends StatelessWidget {
  final VerifiedVehicle vehicle;
  final VoidCallback onContinueRide;
  final VoidCallback onScan;

  const _VerifiedVehicleHero({
    required this.vehicle,
    required this.onContinueRide,
    required this.onScan,
  });

  @override
  Widget build(BuildContext context) => _HeroSurface(
        label: 'DRIVER VERIFIED',
        icon: Icons.verified_user_outlined,
        title: vehicle.driverName,
        message:
            '${_vehicleLabel(vehicle.vehicleType)} · ${vehicle.plateNumber}',
        primaryLabel: 'Continue to fare',
        primaryIcon: Icons.arrow_forward_rounded,
        onPrimary: onContinueRide,
        secondaryLabel: 'Scan another QR',
        secondaryIcon: Icons.qr_code_scanner_rounded,
        onSecondary: onScan,
      );
}

class _ActiveRideHero extends StatelessWidget {
  final Ride ride;
  final VoidCallback onShareRide;
  final VoidCallback onSos;
  final VoidCallback onEndRide;
  final VoidCallback onReport;

  const _ActiveRideHero({
    required this.ride,
    required this.onShareRide,
    required this.onSos,
    required this.onEndRide,
    required this.onReport,
  });

  @override
  Widget build(BuildContext context) {
    final fare = ride.currentFare ?? ride.estimatedFare;
    return Semantics(
      container: true,
      label: 'Active ride session. Ride in progress.',
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xffdbe8d7)),
          boxShadow: const [
            BoxShadow(
                color: Color(0x1c173e2e), blurRadius: 24, offset: Offset(0, 10))
          ],
        ),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _ActiveRideHeader(fare: fare),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _RideActionStrip(onShareRide: onShareRide, onSos: onSos),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: onReport,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(44),
                  foregroundColor: const Color(0xffa92d34),
                  side: const BorderSide(color: Color(0xffe4b5b8)),
                ),
                icon: const Icon(Icons.report_problem_outlined, size: 18),
                label: const Text('Report driver or incident'),
              ),
              const SizedBox(height: 14),
              _RidePanel(
                icon: Icons.verified_user_rounded,
                title: 'Verified driver',
                child: _DriverDetails(ride: ride),
              ),
              const SizedBox(height: 12),
              _RidePanel(
                icon: Icons.route_rounded,
                title: 'Ride information',
                child: _RouteDetails(ride: ride),
              ),
              const SizedBox(height: 12),
              _RidePanel(
                icon: Icons.receipt_long_rounded,
                title: 'Live trip summary',
                child: _RideSummary(ride: ride, fare: fare),
              ),
              const SizedBox(height: 14),
              _SafetyReminder(onSos: onSos),
              const SizedBox(height: 14),
              Semantics(
                button: true,
                label: 'End active ride',
                hint: 'Saves the tracked distance and final official fare',
                child: FilledButton.icon(
                  onPressed: onEndRide,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 52),
                    backgroundColor: const Color(0xffbd2626),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.stop_circle_outlined, size: 20),
                  label: const Text('End ride',
                      style: TextStyle(fontWeight: FontWeight.w900)),
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                  child: Text('End your ride only after you have arrived.',
                      textAlign: TextAlign.center,
                      style:
                          TextStyle(color: TriSafeColors.muted, fontSize: 11))),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _ActiveRideHeader extends StatelessWidget {
  final double fare;
  const _ActiveRideHeader({required this.fare});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 17),
        decoration: const BoxDecoration(
            gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xff073c25), Color(0xff126334)])),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .14),
                  borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.route_rounded,
                  color: TriSafeColors.lime, size: 23)),
          const SizedBox(width: 12),
          const Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                _HeroLabel(
                    icon: Icons.navigation_rounded, text: 'RIDE IN PROGRESS'),
                SizedBox(height: 7),
                Text('Ride session',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w900)),
                SizedBox(height: 2),
                Text('Your verified ride is being tracked.',
                    style: TextStyle(color: Color(0xffd4e4d6), fontSize: 11)),
              ])),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            const Text('LIVE FARE',
                style: TextStyle(
                    color: Color(0xffb7dcb8),
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: .8)),
            const SizedBox(height: 4),
            Text('₱${fare.toStringAsFixed(2)}',
                style: const TextStyle(
                    color: TriSafeColors.lime,
                    fontSize: 19,
                    fontWeight: FontWeight.w900)),
          ]),
        ]),
      );
}

class _RideActionStrip extends StatelessWidget {
  final VoidCallback onShareRide;
  final VoidCallback onSos;
  const _RideActionStrip({required this.onShareRide, required this.onSos});

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(
            child: _RideAction(
                icon: Icons.ios_share_rounded,
                label: 'SafeShare',
                message: 'Share your ride\nwith a contact',
                foreground: const Color(0xff176b36),
                background: const Color(0xffedf8ed),
                onPressed: onShareRide)),
        const SizedBox(width: 10),
        Expanded(
            child: _RideAction(
                icon: Icons.sos_rounded,
                label: 'Emergency SOS',
                message: 'Open emergency\ncontact options',
                foreground: const Color(0xffb22626),
                background: const Color(0xffffefef),
                onPressed: onSos)),
      ]);
}

class _RideAction extends StatelessWidget {
  final IconData icon;
  final String label, message;
  final Color foreground, background;
  final VoidCallback onPressed;
  const _RideAction(
      {required this.icon,
      required this.label,
      required this.message,
      required this.foreground,
      required this.background,
      required this.onPressed});

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        hint: message.replaceAll('\n', ' '),
        child: Material(
          color: background,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            onTap: onPressed,
            borderRadius: BorderRadius.circular(14),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 76),
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(icon, color: foreground, size: 22),
                      const SizedBox(width: 7),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                            Text(label,
                                style: TextStyle(
                                    color: foreground,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900)),
                            const SizedBox(height: 2),
                            Text(message,
                                style: const TextStyle(
                                    color: TriSafeColors.muted,
                                    fontSize: 9,
                                    height: 1.25)),
                          ])),
                    ]),
              ),
            ),
          ),
        ),
      );
}

class _RidePanel extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget child;
  const _RidePanel(
      {required this.icon, required this.title, required this.child});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: const Color(0xfffcfefb),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xffe1ebe0))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, color: const Color(0xff26751d), size: 18),
            const SizedBox(width: 7),
            Text(title,
                style: const TextStyle(
                    color: TriSafeColors.black,
                    fontSize: 12,
                    fontWeight: FontWeight.w900))
          ]),
          const SizedBox(height: 11),
          child,
        ]),
      );
}

class _DriverDetails extends StatelessWidget {
  final Ride ride;
  const _DriverDetails({required this.ride});
  @override
  Widget build(BuildContext context) {
    final identifier =
        ride.vehicleType == 'HABAL_HABAL' ? ride.permitNumber : ride.bodyNumber;
    final identifierLabel =
        ride.vehicleType == 'HABAL_HABAL' ? 'Permit number' : 'Body number';
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(ride.driverName ?? 'Verified driver',
          style: const TextStyle(
              color: TriSafeColors.black,
              fontSize: 16,
              fontWeight: FontWeight.w900)),
      const SizedBox(height: 3),
      Text(
          '${_vehicleLabel(ride.vehicleType)} · ${ride.plateNumber ?? 'Registered vehicle'}',
          style: const TextStyle(
              color: TriSafeColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600)),
      const Divider(height: 20, color: Color(0xffe4ebe2)),
      _DriverDetailRow(
        icon: Icons.business_rounded,
        label: 'Registered owner / operator',
        value: ride.operatorName ?? 'Not recorded',
      ),
      const SizedBox(height: 8),
      _DriverDetailRow(
        icon: ride.vehicleType == 'HABAL_HABAL'
            ? Icons.assignment_rounded
            : Icons.electric_rickshaw_rounded,
        label: identifierLabel,
        value: identifier ?? 'Not recorded',
      ),
      const SizedBox(height: 8),
      _DriverDetailRow(
        icon: Icons.star_rounded,
        iconColor: const Color(0xffc27a00),
        label: 'Overall driver rating',
        value: _ratingLabel(ride.averageDriverRating, ride.driverRatingCount),
      ),
    ]);
  }
}

class _DriverDetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? iconColor;

  const _DriverDetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: iconColor ?? const Color(0xff4d774f)),
          const SizedBox(width: 9),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label,
                  style: const TextStyle(
                      color: TriSafeColors.muted, fontSize: 10)),
              const SizedBox(height: 1),
              Text(value,
                  style: const TextStyle(
                      color: TriSafeColors.black,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
            ]),
          ),
        ],
      );
}

class _RouteDetails extends StatelessWidget {
  final Ride ride;
  const _RouteDetails({required this.ride});
  @override
  Widget build(BuildContext context) => Column(children: [
        _RideStop(
            icon: Icons.arrow_upward_rounded,
            iconColor: const Color(0xff247c3b),
            label: 'Pickup',
            value:
                _safeLocationLabel(ride.fromLocationName, 'Current location')),
        const Padding(
            padding: EdgeInsets.only(left: 18),
            child: Divider(height: 16, color: Color(0xffe4ebe2))),
        _RideStop(
            icon: Icons.arrow_downward_rounded,
            iconColor: const Color(0xff26751d),
            label: 'Destination',
            value: _safeLocationLabel(
                ride.toLocationName, 'Selected destination')),
      ]);
}

class _RideStop extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label, value;
  const _RideStop(
      {required this.icon,
      required this.iconColor,
      required this.label,
      required this.value});
  @override
  Widget build(BuildContext context) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: iconColor.withValues(alpha: .10),
                shape: BoxShape.circle),
            child: Icon(icon, size: 16, color: iconColor)),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: const TextStyle(color: TriSafeColors.muted, fontSize: 10)),
          const SizedBox(height: 2),
          Text(value,
              style: const TextStyle(
                  color: TriSafeColors.black,
                  fontSize: 12,
                  height: 1.25,
                  fontWeight: FontWeight.w800)),
        ])),
      ]);
}

class _RideSummary extends StatelessWidget {
  final Ride ride;
  final double fare;
  const _RideSummary({required this.ride, required this.fare});
  @override
  Widget build(BuildContext context) => Column(children: [
        _RideSummaryRow(
            icon: Icons.payments_outlined,
            label: 'Current fare',
            value: '₱${fare.toStringAsFixed(2)}',
            valueColor: const Color(0xff26751d)),
        _RideSummaryRow(
            icon: Icons.straighten_rounded,
            label: 'Tracked distance',
            value:
                '${(ride.actualDistanceMeters / 1000).toStringAsFixed(2)} km'),
        _RideSummaryRow(
            icon: Icons.schedule_rounded,
            label: 'Ride started',
            value: _rideStartLabel(ride.startedAt)),
        const _RideSummaryRow(
            icon: Icons.trip_origin_rounded,
            label: 'Ride status',
            value: 'Ongoing',
            showStatus: true),
      ]);
}

class _RideSummaryRow extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final Color? valueColor;
  final bool showStatus;
  const _RideSummaryRow(
      {required this.icon,
      required this.label,
      required this.value,
      this.valueColor,
      this.showStatus = false});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: [
          Icon(icon, size: 17, color: const Color(0xff4d774f)),
          const SizedBox(width: 9),
          Expanded(
              child: Text(label,
                  style: const TextStyle(
                      color: TriSafeColors.muted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600))),
          if (showStatus)
            Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                    color: const Color(0xffe8f6e8),
                    borderRadius: BorderRadius.circular(99)),
                child: Text(value,
                    style: const TextStyle(
                        color: Color(0xff176b36),
                        fontSize: 10,
                        fontWeight: FontWeight.w900)))
          else
            Flexible(
                child: Text(value,
                    textAlign: TextAlign.end,
                    style: TextStyle(
                        color: valueColor ?? TriSafeColors.black,
                        fontSize: 12,
                        fontWeight: FontWeight.w900))),
        ]),
      );
}

class _SafetyReminder extends StatelessWidget {
  final VoidCallback onSos;
  const _SafetyReminder({required this.onSos});
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: 'Safety reminder',
        hint: 'Open emergency contact options',
        child: Material(
          color: const Color(0xffeff8ee),
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            onTap: onSos,
            borderRadius: BorderRadius.circular(14),
            child: const Padding(
              padding: EdgeInsets.all(12),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(Icons.health_and_safety_rounded,
                    color: Color(0xff176b36), size: 21),
                SizedBox(width: 9),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text('Safety reminder',
                          style: TextStyle(
                              color: TriSafeColors.black,
                              fontSize: 11,
                              fontWeight: FontWeight.w900)),
                      SizedBox(height: 2),
                      Text(
                          'You can share this ride or open emergency contacts at any time.',
                          style: TextStyle(
                              color: TriSafeColors.muted,
                              fontSize: 10,
                              height: 1.3)),
                    ])),
              ]),
            ),
          ),
        ),
      );
}

String _rideStartLabel(DateTime? startedAt) {
  if (startedAt == null) return 'Just started';
  final local = startedAt.toLocal();
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
    'Dec'
  ];
  final hour =
      local.hour == 0 ? 12 : (local.hour > 12 ? local.hour - 12 : local.hour);
  final minute = local.minute.toString().padLeft(2, '0');
  return '${months[local.month - 1]} ${local.day}, ${local.year} · $hour:$minute ${local.hour >= 12 ? 'PM' : 'AM'}';
}

String _ratingLabel(double? rating, int count) {
  if (rating == null || count == 0) return 'No passenger ratings yet';
  final reviewWord = count == 1 ? 'rating' : 'ratings';
  return '${rating.toStringAsFixed(1)} / 5.0 · $count $reviewWord';
}

String _safeLocationLabel(String? name, String fallback) {
  if (name == null || name.trim().isEmpty) return fallback;
  // Legacy rides could store coordinate labels. Coordinates are never useful
  // as a passenger-facing place name, and the actual coordinates remain in
  // protected ride fields for routing and audit use.
  if (RegExp(r'\(-?\d+\.\d+,\s*-?\d+\.\d+\)').hasMatch(name)) {
    return fallback;
  }
  return name;
}

class _HeroSurface extends StatelessWidget {
  final String label;
  final IconData icon;
  final String title;
  final String message;
  final String primaryLabel;
  final IconData primaryIcon;
  final VoidCallback onPrimary;
  final String secondaryLabel;
  final IconData secondaryIcon;
  final VoidCallback onSecondary;

  const _HeroSurface({
    required this.label,
    required this.icon,
    required this.title,
    required this.message,
    required this.primaryLabel,
    required this.primaryIcon,
    required this.onPrimary,
    required this.secondaryLabel,
    required this.secondaryIcon,
    required this.onSecondary,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: _heroDecoration,
        child: Stack(children: [
          const Positioned(
            right: -27,
            top: -30,
            child: Icon(Icons.shield_outlined,
                size: 148, color: Color(0x20ffffff)),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _HeroLabel(icon: icon, text: label),
            const SizedBox(height: 14),
            Text(title,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 21,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(message,
                style: const TextStyle(
                    color: Color(0xffc7cec7), fontSize: 12, height: 1.4)),
            const SizedBox(height: 18),
            Row(children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: onPrimary,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 48),
                    backgroundColor: TriSafeColors.lime,
                    foregroundColor: TriSafeColors.black,
                  ),
                  icon: Icon(primaryIcon, size: 19),
                  label: Text(primaryLabel, overflow: TextOverflow.ellipsis),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onSecondary,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 48),
                    foregroundColor: Colors.white,
                    side:
                        BorderSide(color: Colors.white.withValues(alpha: .42)),
                  ),
                  icon: Icon(secondaryIcon, size: 18),
                  label: Text(secondaryLabel, overflow: TextOverflow.ellipsis),
                ),
              ),
            ]),
          ]),
        ]),
      );
}

final _heroDecoration = BoxDecoration(
  gradient: const LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xff124f44), Color(0xff26751d), Color(0xff3d941b)],
  ),
  border: Border.all(color: const Color(0xff75de4f).withValues(alpha: .32)),
  borderRadius: BorderRadius.circular(24),
  boxShadow: const [
    BoxShadow(
      color: Color(0x24185449),
      blurRadius: 24,
      offset: Offset(0, 10),
    ),
  ],
);

class _HeroLabel extends StatelessWidget {
  final IconData icon;
  final String text;
  const _HeroLabel({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: TriSafeColors.lime.withValues(alpha: .15),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 13, color: TriSafeColors.lime),
          const SizedBox(width: 5),
          Text(text,
              style: const TextStyle(
                  color: TriSafeColors.lime,
                  fontSize: 9,
                  letterSpacing: .8,
                  fontWeight: FontWeight.w900)),
        ]),
      );
}

String _vehicleLabel(String vehicleType) =>
    vehicleType == 'HABAL_HABAL' ? 'Habal-habal' : 'Tricycle';
