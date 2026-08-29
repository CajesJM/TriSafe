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
  });

  @override
  Widget build(BuildContext context) {
    if (activeRide != null) {
      return _ActiveRideHero(
        ride: activeRide!,
        onShareRide: onShareRide,
        onSos: onSos,
        onEndRide: onEndRide,
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

  const _ActiveRideHero({
    required this.ride,
    required this.onShareRide,
    required this.onSos,
    required this.onEndRide,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: _heroDecoration,
        child: Stack(children: [
          const Positioned(
            right: -24,
            top: -31,
            child:
                Icon(Icons.route_rounded, size: 150, color: Color(0x1fffffff)),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                _HeroLabel(
                    icon: Icons.navigation_rounded, text: 'RIDE IN PROGRESS'),
                const Spacer(),
                Text(
                  '₱${(ride.currentFare ?? ride.estimatedFare).toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: TriSafeColors.lime,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ]),
              const SizedBox(height: 15),
              Text(
                ride.driverName ?? 'Verified driver',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                '${ride.fromLocationName ?? 'Current location'} → ${ride.toLocationName ?? 'Destination'}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xffc7cec7), fontSize: 12),
              ),
              const SizedBox(height: 17),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onShareRide,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(
                          color: Colors.white.withValues(alpha: .25)),
                    ),
                    icon: const Icon(Icons.ios_share_rounded),
                    label: const Text('SafeShare'),
                  ),
                ),
                const SizedBox(width: 9),
                IconButton.filledTonal(
                  onPressed: onSos,
                  tooltip: 'Emergency SOS',
                  style: IconButton.styleFrom(
                    foregroundColor: const Color(0xffff9a9a),
                    backgroundColor: const Color(0xff581e1e),
                  ),
                  icon: const Icon(Icons.sos_outlined),
                ),
                const SizedBox(width: 9),
                FilledButton(
                  onPressed: onEndRide,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 46),
                    backgroundColor: TriSafeColors.lime,
                    foregroundColor: TriSafeColors.black,
                  ),
                  child: const Text('End ride'),
                ),
              ]),
            ],
          ),
        ]),
      );
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
