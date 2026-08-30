import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../models/fare_models.dart';
import '../../models/ride_models.dart';
import '../../models/vehicle_models.dart';
import '../../services/trisafe_api.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger_fare_map.dart';

class PassengerFareTab extends StatefulWidget {
  final TriSafeApi api;
  final VerifiedVehicle? vehicle;
  final String? qrToken;
  final Ride? activeRide;
  final bool isActive;
  final VoidCallback onScan;
  final ValueChanged<String> onError;
  final ValueChanged<String> onSuccess;
  final ValueChanged<Ride> onRideStarted;

  const PassengerFareTab({
    super.key,
    required this.api,
    required this.vehicle,
    required this.qrToken,
    required this.activeRide,
    required this.isActive,
    required this.onScan,
    required this.onError,
    required this.onSuccess,
    required this.onRideStarted,
  });

  @override
  State<PassengerFareTab> createState() => _PassengerFareTabState();
}

class _PassengerFareTabState extends State<PassengerFareTab> {
  LatLng? currentLocation;
  LatLng? destination;
  FareEstimate? fare;
  String vehicleType = 'TRICYCLE';
  String passengerType = 'REGULAR';
  int calculationRequest = 0;
  bool locating = false;
  bool calculating = false;
  bool locationAnnounced = false;
  bool startingRide = false;

  @override
  void initState() {
    super.initState();
    vehicleType = widget.vehicle?.vehicleType ?? 'TRICYCLE';
    if (widget.isActive) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _ensureLocation());
    }
  }

  @override
  void didUpdateWidget(covariant PassengerFareTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !oldWidget.isActive && currentLocation == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _ensureLocation());
    }
    if (widget.vehicle?.vehicleType != null &&
        widget.vehicle?.vehicleType != oldWidget.vehicle?.vehicleType) {
      setState(() {
        vehicleType = widget.vehicle!.vehicleType;
        destination = null;
        fare = null;
      });
      if (widget.isActive && currentLocation == null) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _ensureLocation());
      }
    }
  }

  Future<void> _ensureLocation() async {
    if (locating) return;
    setState(() => locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        if (mounted) {
          await _showLocationProblem(_LocationProblem.servicesDisabled);
        }
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever) {
        if (mounted) await _showLocationProblem(_LocationProblem.deniedForever);
        return;
      }
      if (permission == LocationPermission.denied) {
        if (mounted) await _showLocationProblem(_LocationProblem.denied);
        return;
      }

      final position = await _bestAvailablePosition();
      if (!mounted) return;
      setState(() =>
          currentLocation = LatLng(position.latitude, position.longitude));
      if (!locationAnnounced) {
        locationAnnounced = true;
        widget.onSuccess('Location detected successfully.');
      }
      if (destination != null) await _calculateFare(showValidation: false);
    } on _PoorLocationAccuracyException {
      if (mounted) await _showLocationProblem(_LocationProblem.lowAccuracy);
    } on TimeoutException {
      if (mounted) await _showLocationProblem(_LocationProblem.timeout);
    } catch (_) {
      if (mounted) await _showLocationProblem(_LocationProblem.unavailable);
    } finally {
      if (mounted) setState(() => locating = false);
    }
  }

  Future<Position> _bestAvailablePosition() async {
    var best = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        timeLimit: Duration(seconds: 15),
      ),
    );
    if (best.accuracy <= 25) return best;

    // A phone's first fix may come from a coarse network estimate. Give GPS a
    // short window to improve it and retain the most accurate sample instead
    // of accepting the first coordinate blindly.
    final finished = Completer<void>();
    final timer = Timer(const Duration(seconds: 8), () {
      if (!finished.isCompleted) finished.complete();
    });
    late final StreamSubscription<Position> subscription;
    subscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 0,
      ),
    ).listen(
      (position) {
        if (position.accuracy < best.accuracy) best = position;
        if (best.accuracy <= 25 && !finished.isCompleted) finished.complete();
      },
      onError: (_) {
        if (!finished.isCompleted) finished.complete();
      },
    );
    await finished.future;
    timer.cancel();
    await subscription.cancel();

    // At this precision a point can easily cross a barangay boundary. Do not
    // present an administrative name as accurate when the device is not.
    if (best.accuracy > 50) throw const _PoorLocationAccuracyException();
    return best;
  }

  Future<void> _showLocationProblem(_LocationProblem problem) async {
    final details = switch (problem) {
      _LocationProblem.servicesDisabled => (
          'Location services are off',
          'Turn on your device location, then return to TriSafe and try again.',
          'Open location settings'
        ),
      _LocationProblem.deniedForever => (
          'Location permission is blocked',
          'Allow location access from your browser or application settings before estimating a fare.',
          'Open app settings'
        ),
      _LocationProblem.denied => (
          'Location permission is required',
          'TriSafe needs your current position to measure the distance to your selected destination.',
          'Try again'
        ),
      _LocationProblem.timeout => (
          'Location detection timed out',
          'Move to an area with a clearer GPS or network signal, then try again.',
          'Try again'
        ),
      _LocationProblem.lowAccuracy => (
          'Precise location is needed',
          'Your phone is providing an approximate position, which can select the wrong barangay. Allow precise location for TriSafe, move where the GPS signal is clearer, then try again.',
          'Open app settings'
        ),
      _LocationProblem.unavailable => (
          'Location is unavailable',
          'TriSafe could not read your current location. Check your device settings and connection.',
          'Try again'
        ),
    };
    final action = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.location_off_outlined,
            color: TriSafeColors.danger, size: 34),
        title: Text(details.$1),
        content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 390),
            child: Text(details.$2)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Not now')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(details.$3)),
        ],
      ),
    );
    if (action != true) return;
    if (problem == _LocationProblem.servicesDisabled) {
      await Geolocator.openLocationSettings();
    } else if (problem == _LocationProblem.deniedForever ||
        problem == _LocationProblem.lowAccuracy) {
      await Geolocator.openAppSettings();
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) => _ensureLocation());
    }
  }

  Future<void> _selectDestination(LatLng point) async {
    setState(() {
      destination = point;
      fare = null;
    });
    await _calculateFare(showValidation: false);
  }

  Future<void> _calculateFare({bool showValidation = true}) async {
    final origin = currentLocation;
    final selectedDestination = destination;
    if (origin == null) {
      if (showValidation) {
        await _showLocationProblem(_LocationProblem.unavailable);
      }
      return;
    }
    if (selectedDestination == null) {
      if (showValidation && mounted) {
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            icon: const Icon(Icons.touch_app_outlined,
                color: TriSafeColors.forest),
            title: const Text('Choose a destination'),
            content: const Text(
                'Tap or click anywhere on the map to mark where you want to go.'),
            actions: [
              FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Got it'))
            ],
          ),
        );
      }
      return;
    }

    final request = ++calculationRequest;
    setState(() => calculating = true);
    try {
      final result = await widget.api.estimateDistanceFare(
          vehicleType: vehicleType,
          passengerType: passengerType,
          originLatitude: origin.latitude,
          originLongitude: origin.longitude,
          destinationLatitude: selectedDestination.latitude,
          destinationLongitude: selectedDestination.longitude);
      if (!mounted || request != calculationRequest) return;
      setState(() => fare = result);
      widget.onSuccess(
          'Fare calculated from the active LGU ${_vehicleLabel(vehicleType)} rate.');
    } catch (error) {
      if (!mounted || request != calculationRequest) return;
      setState(() => fare = null);
      widget.onError(_friendlyError(error, vehicleType));
    } finally {
      if (mounted && request == calculationRequest) {
        setState(() => calculating = false);
      }
    }
  }

  void _changeVehicleType(String? value) {
    if (value == null || value == vehicleType) return;
    setState(() {
      vehicleType = value;
      fare = null;
    });
    if (destination != null) _calculateFare(showValidation: false);
  }

  void _changePassengerType(String value) {
    if (value == passengerType) return;
    setState(() {
      passengerType = value;
      fare = null;
    });
    if (destination != null) _calculateFare(showValidation: false);
  }

  Future<void> _startRide() async {
    final vehicle = widget.vehicle;
    final qrToken = widget.qrToken;
    final origin = currentLocation;
    final selectedDestination = destination;
    final estimate = fare;
    if (vehicle == null || qrToken == null) {
      widget.onError(
          'Scan an eligible LGU-issued driver QR before starting a ride.');
      return;
    }
    if (widget.activeRide != null) {
      widget.onError('Complete your active ride before starting another.');
      return;
    }
    if (origin == null || selectedDestination == null || estimate == null) {
      widget.onError(
          'Select a destination and calculate the official fare first.');
      return;
    }
    late final List<FareLocationName> placeNames;
    try {
      placeNames = await Future.wait([
        widget.api.fareLocationName(
          latitude: origin.latitude,
          longitude: origin.longitude,
        ),
        widget.api.fareLocationName(
          latitude: selectedDestination.latitude,
          longitude: selectedDestination.longitude,
        ),
      ]);
    } catch (_) {
      placeNames = const [
        FareLocationName(
          name: 'Current location',
          context: 'Bohol, Philippines',
        ),
        FareLocationName(
          name: 'Selected destination',
          context: 'Bohol, Philippines',
        ),
      ];
    }
    if (!mounted) return;
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => _StartVerifiedRideDialog(
            driverName: vehicle.driverName,
            plateNumber: vehicle.plateNumber,
            vehicleType: vehicle.vehicleType,
            ownerName: vehicle.ownerName,
            bodyNumber: vehicle.bodyNumber,
            permitNumber: vehicle.permitNumber,
            averageRating: vehicle.averageRating,
            ratingCount: vehicle.ratingCount,
            pickupName: placeNames[0].name == 'Selected location'
                ? 'Current location'
                : placeNames[0].name,
            pickupContext: placeNames[0].context,
            destinationName: placeNames[1].name,
            destinationContext: placeNames[1].context,
            distance: _compactDistanceLabel(estimate.distanceKm ?? 0),
            duration: _durationLabel(estimate.routeDurationSeconds),
            estimatedFare: '₱${estimate.amount.toStringAsFixed(2)}',
            passengerType: estimate.passengerType,
            discountPercent: estimate.discountPercent,
            discountAmount: estimate.discountAmount,
          ),
        ) ??
        false;
    if (!confirmed || !mounted) return;

    setState(() => startingRide = true);
    try {
      final ride = await widget.api.startMapRide(
        vehicleId: vehicle.vehicleId,
        qrToken: qrToken,
        originLatitude: origin.latitude,
        originLongitude: origin.longitude,
        destinationLatitude: selectedDestination.latitude,
        destinationLongitude: selectedDestination.longitude,
        originLocationName: placeNames[0].context,
        destinationLocationName: placeNames[1].context,
        passengerType: passengerType,
      );
      if (!mounted) return;
      widget.onRideStarted(ride);
    } catch (error) {
      if (!mounted) return;
      widget.onError(_startRideError(error));
    } finally {
      if (mounted) setState(() => startingRide = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final distanceKm = fare?.distanceKm;
    final hasVerifiedDriver = widget.vehicle != null && widget.qrToken != null;
    return Stack(
      children: [
        const Positioned.fill(child: _FareBackdrop()),
        ListView(
          padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
          children: [
            _FareHeader(hasVerifiedDriver: hasVerifiedDriver),
            const SizedBox(height: 18),
            _FareProgress(
              hasLocation: currentLocation != null,
              hasDestination: destination != null,
              hasFare: fare != null,
            ),
            const SizedBox(height: 14),
            LayoutBuilder(builder: (context, constraints) {
              final wide = constraints.maxWidth >= 760;
              final controls = _FareControls(
                vehicleType: vehicleType,
                passengerType: passengerType,
                verifiedVehicle: widget.vehicle,
                onVehicleChanged: _changeVehicleType,
                onPassengerTypeChanged: _changePassengerType,
                onScan: widget.onScan,
              );
              final routePlanner = _RoutePlanner(
                location: currentLocation,
                destination: destination,
                locating: locating,
                calculating: calculating,
                routeCoordinates: fare?.routeCoordinates ?? const [],
                onLocate: _ensureLocation,
                onDestinationSelected: _selectDestination,
              );
              final result = _FareResult(
                fare: fare,
                distanceKm: distanceKm,
                calculating: calculating,
                startingRide: startingRide,
                hasVerifiedDriver: hasVerifiedDriver,
                hasActiveRide: widget.activeRide != null,
                onCalculate: _calculateFare,
                onStartRide: _startRide,
              );

              if (!wide) {
                return Column(
                  children: [
                    controls,
                    const SizedBox(height: 14),
                    routePlanner,
                    const SizedBox(height: 14),
                    result,
                  ],
                );
              }
              return Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 5, child: routePlanner),
                      const SizedBox(width: 14),
                      Expanded(flex: 3, child: controls),
                    ],
                  ),
                  const SizedBox(height: 14),
                  result,
                ],
              );
            }),
            const SizedBox(height: 14),
            const _FareNotice(),
          ],
        ),
      ],
    );
  }
}

class _FareBackdrop extends StatelessWidget {
  const _FareBackdrop();

  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xfff4faf1), Color(0xfff8faf7)],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                top: -105,
                right: -95,
                child: Container(
                  width: 260,
                  height: 260,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0x125dd62c),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

class _FareHeader extends StatelessWidget {
  final bool hasVerifiedDriver;

  const _FareHeader({required this.hasVerifiedDriver});

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: TriSafeColors.lime,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 7),
                    const Text(
                      'TRINIDAD LGU FARE',
                      style: TextStyle(
                        color: TriSafeColors.forest,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Plan your trip',
                  style: TextStyle(
                    color: TriSafeColors.black,
                    fontSize: 28,
                    height: 1.05,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -.5,
                  ),
                ),
                const SizedBox(height: 7),
                const Text(
                  'Choose your transport and destination. TriSafe calculates the official fare from the mapped road distance.',
                  style: TextStyle(
                    color: TriSafeColors.muted,
                    fontSize: 12,
                    height: 1.45,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: hasVerifiedDriver
                  ? TriSafeColors.forest
                  : TriSafeColors.black,
              borderRadius: BorderRadius.circular(15),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1f0f0f0f),
                  blurRadius: 18,
                  offset: Offset(0, 7),
                ),
              ],
            ),
            child: Icon(
              hasVerifiedDriver
                  ? Icons.verified_user_rounded
                  : Icons.route_rounded,
              color: hasVerifiedDriver ? TriSafeColors.lime : Colors.white,
              size: 23,
            ),
          ),
        ],
      );
}

class _FareProgress extends StatelessWidget {
  final bool hasLocation;
  final bool hasDestination;
  final bool hasFare;

  const _FareProgress({
    required this.hasLocation,
    required this.hasDestination,
    required this.hasFare,
  });

  @override
  Widget build(BuildContext context) {
    final activeStep = hasFare
        ? 3
        : hasDestination
            ? 2
            : hasLocation
                ? 1
                : 0;
    const steps = [
      (Icons.my_location_rounded, 'Locate'),
      (Icons.flag_rounded, 'Destination'),
      (Icons.receipt_long_rounded, 'Fare'),
    ];

    return Semantics(
      label: hasFare
          ? 'Fare planning complete. 3 of 3.'
          : 'Fare planning progress. Step ${activeStep + 1} of 3.',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .86),
          border: Border.all(color: const Color(0xffd8e6d3)),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: List.generate(steps.length * 2 - 1, (index) {
            if (index.isOdd) {
              final complete = index ~/ 2 < activeStep;
              return Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.symmetric(horizontal: 7),
                  color: complete ? TriSafeColors.lime : TriSafeColors.line,
                ),
              );
            }
            final stepIndex = index ~/ 2;
            final complete = stepIndex < activeStep;
            final current = stepIndex == activeStep && activeStep < 3;
            return _ProgressStep(
              icon: steps[stepIndex].$1,
              label: steps[stepIndex].$2,
              complete: complete,
              current: current,
            );
          }),
        ),
      ),
    );
  }
}

class _ProgressStep extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool complete;
  final bool current;

  const _ProgressStep({
    required this.icon,
    required this.label,
    required this.complete,
    required this.current,
  });

  @override
  Widget build(BuildContext context) {
    final highlighted = complete || current;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: complete
                ? TriSafeColors.forest
                : current
                    ? TriSafeColors.softGreen
                    : const Color(0xfff1f3f0),
            shape: BoxShape.circle,
            border: Border.all(
              color: highlighted ? TriSafeColors.forest : TriSafeColors.line,
            ),
          ),
          child: Icon(
            complete ? Icons.check_rounded : icon,
            color: complete
                ? Colors.white
                : highlighted
                    ? TriSafeColors.forest
                    : TriSafeColors.muted,
            size: 17,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: TextStyle(
            color: highlighted ? TriSafeColors.black : TriSafeColors.muted,
            fontSize: 10,
            fontWeight: highlighted ? FontWeight.w800 : FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _RoutePlanner extends StatelessWidget {
  final LatLng? location;
  final LatLng? destination;
  final bool locating;
  final bool calculating;
  final List<FareRoutePoint> routeCoordinates;
  final VoidCallback onLocate;
  final ValueChanged<LatLng> onDestinationSelected;

  const _RoutePlanner({
    required this.location,
    required this.destination,
    required this.locating,
    required this.calculating,
    required this.routeCoordinates,
    required this.onLocate,
    required this.onDestinationSelected,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(22),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0f0f0f0f),
              blurRadius: 20,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _LocationStatus(
              location: location,
              locating: locating,
              onLocate: onLocate,
            ),
            const SizedBox(height: 11),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Choose your destination',
                          style: TextStyle(
                            color: TriSafeColors.black,
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          destination == null
                              ? 'Tap a road location on the map'
                              : calculating
                                  ? 'Calculating the official road fare…'
                                  : 'Destination selected — tap again to move it',
                          style: const TextStyle(
                            color: TriSafeColors.muted,
                            fontSize: 11,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (destination != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: TriSafeColors.softGreen,
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            Icons.check_circle_rounded,
                            color: TriSafeColors.forest,
                            size: 14,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'SET',
                            style: TextStyle(
                              color: TriSafeColors.forest,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: .7,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 350,
              child: PassengerFareMap(
                currentLocation: location,
                destination: destination,
                routeCoordinates: routeCoordinates,
                onDestinationSelected: onDestinationSelected,
                onLocate: onLocate,
                locating: locating,
              ),
            ),
          ],
        ),
      );
}

enum _LocationProblem {
  servicesDisabled,
  deniedForever,
  denied,
  timeout,
  lowAccuracy,
  unavailable
}

class _PoorLocationAccuracyException implements Exception {
  const _PoorLocationAccuracyException();
}

class _LocationStatus extends StatelessWidget {
  final LatLng? location;
  final bool locating;
  final VoidCallback onLocate;
  const _LocationStatus({
    required this.location,
    required this.locating,
    required this.onLocate,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
        decoration: BoxDecoration(
          color: location == null
              ? const Color(0xfffff7ea)
              : TriSafeColors.softGreen,
          border: Border.all(
            color: location == null
                ? const Color(0xffffd49b)
                : const Color(0xffcfe4c8),
          ),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Row(children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: location == null
                  ? const Color(0xffffe6bf)
                  : Colors.white.withValues(alpha: .9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              location == null
                  ? Icons.location_searching_rounded
                  : Icons.my_location_rounded,
              color: location == null
                  ? const Color(0xff8a5700)
                  : TriSafeColors.forest,
              size: 19,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  location == null
                      ? 'Current location needed'
                      : 'Pickup location ready',
                  style: const TextStyle(
                    color: TriSafeColors.black,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  location == null
                      ? 'Enable location to choose a destination.'
                      : '${location!.latitude.toStringAsFixed(5)}, ${location!.longitude.toStringAsFixed(5)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    color: TriSafeColors.muted,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: locating ? null : onLocate,
            style: TextButton.styleFrom(
              minimumSize: const Size(48, 44),
              foregroundColor: TriSafeColors.forest,
            ),
            child: locating
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(location == null ? 'Enable' : 'Refresh'),
          ),
        ]),
      );
}

class _FareControls extends StatelessWidget {
  final String vehicleType;
  final String passengerType;
  final VerifiedVehicle? verifiedVehicle;
  final ValueChanged<String?> onVehicleChanged;
  final ValueChanged<String> onPassengerTypeChanged;
  final VoidCallback onScan;
  const _FareControls({
    required this.vehicleType,
    required this.passengerType,
    required this.verifiedVehicle,
    required this.onVehicleChanged,
    required this.onPassengerTypeChanged,
    required this.onScan,
  });

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: TriSafeColors.softGreen,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.tune_rounded,
                      color: TriSafeColors.forest,
                      size: 19,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Trip options',
                          style: TextStyle(
                            color: TriSafeColors.black,
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Official rates are set by the LGU.',
                          style: TextStyle(
                            fontSize: 11,
                            color: TriSafeColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 15),
              if (verifiedVehicle != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xffe7f7df), Color(0xfff7fcf5)],
                    ),
                    border: Border.all(color: const Color(0xffc9e3be)),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: TriSafeColors.forest,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.verified_rounded,
                          color: TriSafeColors.lime,
                          size: 21,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'VERIFIED VEHICLE',
                              style: TextStyle(
                                color: TriSafeColors.forest,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                letterSpacing: .8,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${verifiedVehicle!.driverName} · ${verifiedVehicle!.plateNumber}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: TriSafeColors.black,
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: onScan,
                        style: TextButton.styleFrom(
                          minimumSize: const Size(48, 44),
                        ),
                        child: const Text('Change'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ] else ...[
                OutlinedButton.icon(
                  onPressed: onScan,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                    foregroundColor: TriSafeColors.forest,
                    backgroundColor: const Color(0xfff9fcf8),
                  ),
                  icon: const Icon(Icons.qr_code_scanner_rounded, size: 19),
                  label: const Text('Scan vehicle QR'),
                ),
                const SizedBox(height: 14),
              ],
              const Text(
                'Vehicle type',
                style: TextStyle(
                  color: TriSafeColors.charcoal,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _VehicleChoice(
                      icon: Icons.electric_rickshaw_rounded,
                      label: 'Tricycle',
                      selected: vehicleType == 'TRICYCLE',
                      enabled: verifiedVehicle == null,
                      onTap: () => onVehicleChanged('TRICYCLE'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _VehicleChoice(
                      icon: Icons.two_wheeler_rounded,
                      label: 'Habal-habal',
                      selected: vehicleType == 'HABAL_HABAL',
                      enabled: verifiedVehicle == null,
                      onTap: () => onVehicleChanged('HABAL_HABAL'),
                    ),
                  ),
                ],
              ),
              if (verifiedVehicle != null) ...[
                const SizedBox(height: 7),
                const Text(
                  'Vehicle type is locked to the verified QR record.',
                  style: TextStyle(
                    color: TriSafeColors.muted,
                    fontSize: 10,
                    height: 1.35,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              const Text('Passenger type',
                  style: TextStyle(
                      color: TriSafeColors.charcoal,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              const Text(
                  'Choose the fare category you can verify with a valid ID at boarding.',
                  style: TextStyle(
                      color: TriSafeColors.muted, fontSize: 10, height: 1.35)),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                    child: _PassengerTypeChoice(
                        icon: Icons.person_outline_rounded,
                        label: 'Regular',
                        selected: passengerType == 'REGULAR',
                        onTap: () => onPassengerTypeChanged('REGULAR'))),
                const SizedBox(width: 6),
                Expanded(
                    child: _PassengerTypeChoice(
                        icon: Icons.school_rounded,
                        label: 'Student',
                        selected: passengerType == 'STUDENT',
                        onTap: () => onPassengerTypeChanged('STUDENT'))),
                const SizedBox(width: 6),
                Expanded(
                    child: _PassengerTypeChoice(
                        icon: Icons.elderly_rounded,
                        label: 'Senior',
                        selected: passengerType == 'SENIOR_CITIZEN',
                        onTap: () => onPassengerTypeChanged('SENIOR_CITIZEN'))),
              ]),
            ],
          ),
        ),
      );
}

class _VehicleChoice extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  const _VehicleChoice({
    required this.icon,
    required this.label,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        enabled: enabled,
        label: label,
        child: Material(
          color: selected ? TriSafeColors.softGreen : Colors.white,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            onTap: enabled ? onTap : null,
            borderRadius: BorderRadius.circular(14),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              constraints: const BoxConstraints(minHeight: 64),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
              decoration: BoxDecoration(
                border: Border.all(
                  color: selected ? TriSafeColors.forest : TriSafeColors.line,
                  width: selected ? 1.5 : 1,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    icon,
                    color:
                        selected ? TriSafeColors.forest : TriSafeColors.muted,
                    size: 21,
                  ),
                  const SizedBox(height: 5),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color:
                          selected ? TriSafeColors.black : TriSafeColors.muted,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
}

class _PassengerTypeChoice extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _PassengerTypeChoice({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        label: label,
        child: Material(
          color: selected ? TriSafeColors.forest : const Color(0xfff8faf7),
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              constraints: const BoxConstraints(minHeight: 58),
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 7),
              decoration: BoxDecoration(
                border: Border.all(
                    color:
                        selected ? TriSafeColors.forest : TriSafeColors.line),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon,
                      size: 18,
                      color:
                          selected ? TriSafeColors.lime : TriSafeColors.forest),
                  const SizedBox(height: 4),
                  Text(label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color:
                              selected ? Colors.white : TriSafeColors.charcoal,
                          fontSize: 10,
                          fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ),
        ),
      );
}

class _FareResult extends StatelessWidget {
  final FareEstimate? fare;
  final double? distanceKm;
  final bool calculating;
  final bool startingRide;
  final bool hasVerifiedDriver;
  final bool hasActiveRide;
  final Future<void> Function({bool showValidation}) onCalculate;
  final VoidCallback onStartRide;
  const _FareResult(
      {required this.fare,
      required this.distanceKm,
      required this.calculating,
      required this.startingRide,
      required this.hasVerifiedDriver,
      required this.hasActiveRide,
      required this.onCalculate,
      required this.onStartRide});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xff101610), Color(0xff1d251d)],
          ),
          border: Border.all(color: const Color(0xff354235)),
          borderRadius: BorderRadius.circular(22),
          boxShadow: const [
            BoxShadow(
              color: Color(0x260f0f0f),
              blurRadius: 24,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: TriSafeColors.lime.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xff3d5d31)),
                  ),
                  child: const Icon(
                    Icons.receipt_long_rounded,
                    color: TriSafeColors.lime,
                    size: 19,
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'OFFICIAL LGU ESTIMATE',
                        style: TextStyle(
                          color: TriSafeColors.lime,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.1,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Road-distance fare summary',
                        style: TextStyle(
                          color: Color(0xffc7cec7),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xff283028),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: const Text(
                    'LIVE RATE',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      letterSpacing: .6,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            if (calculating)
              const _CalculatingFareState()
            else if (fare == null)
              const _EmptyFareState()
            else ...[
              const Text(
                'Estimated total',
                style: TextStyle(
                  color: Color(0xffb9c1b9),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 3),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  '₱${fare!.amount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 40,
                    height: 1.05,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _FareMetric(
                    icon: Icons.route_rounded,
                    value: _compactDistanceLabel(
                      fare!.distanceKm ?? distanceKm ?? 0,
                    ),
                  ),
                  _FareMetric(
                    icon: Icons.schedule_rounded,
                    value: _durationLabel(fare!.routeDurationSeconds),
                  ),
                  _FareMetric(
                    icon: Icons.speed_rounded,
                    value: '₱${(fare!.ratePerKm ?? 0).toStringAsFixed(2)}/km',
                  ),
                ],
              ),
              const SizedBox(height: 15),
              Container(
                padding: const EdgeInsets.all(13),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .045),
                  border: Border.all(color: const Color(0xff343d34)),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Column(
                  children: [
                    _ResultRow(label: 'Base fare', value: fare!.baseFare),
                    _ResultRow(
                      label: 'Distance charge',
                      value: fare!.distanceCharge,
                    ),
                    if (fare!.discountAmount > 0)
                      _ResultRow(
                        label:
                            '${_passengerTypeLabel(fare!.passengerType)} discount (${fare!.discountPercent.toStringAsFixed(0)}%)',
                        value: fare!.discountAmount,
                        negative: true,
                      ),
                    const Divider(height: 18, color: Color(0xff394139)),
                    Row(
                      children: [
                        const Icon(
                          Icons.verified_outlined,
                          color: TriSafeColors.lime,
                          size: 15,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'LGU matrix ${fare!.matrixVersion}',
                            style: const TextStyle(
                              color: Color(0xffaeb7ae),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (fare == null)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: calculating ? null : () => onCalculate(),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 50),
                    backgroundColor: TriSafeColors.lime,
                    foregroundColor: TriSafeColors.black,
                  ),
                  icon: const Icon(Icons.calculate_outlined),
                  label: const Text('Calculate official fare'),
                ),
              )
            else ...[
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: hasVerifiedDriver &&
                          !hasActiveRide &&
                          !calculating &&
                          !startingRide
                      ? onStartRide
                      : null,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 52),
                    backgroundColor: TriSafeColors.lime,
                    foregroundColor: TriSafeColors.black,
                    disabledBackgroundColor: const Color(0xff343b34),
                    disabledForegroundColor: const Color(0xff9fa79f),
                  ),
                  icon: startingRide
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.play_arrow_rounded),
                  label: Text(
                    startingRide ? 'Starting ride…' : 'Start ride',
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: calculating ? null : () => onCalculate(),
                  style: TextButton.styleFrom(
                    minimumSize: const Size(0, 44),
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Recalculate fare'),
                ),
              ),
              if (!hasVerifiedDriver || hasActiveRide) ...[
                const SizedBox(height: 7),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.info_outline_rounded,
                      color: Color(0xffbdc5bd),
                      size: 16,
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        hasActiveRide
                            ? 'Complete your active ride before starting another.'
                            : 'Scan an eligible driver QR to start this ride.',
                        style: const TextStyle(
                          color: Color(0xffbdc5bd),
                          fontSize: 11,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ],
        ),
      );
}

class _CalculatingFareState extends StatelessWidget {
  const _CalculatingFareState();

  @override
  Widget build(BuildContext context) => const SizedBox(
        height: 112,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(
                  color: TriSafeColors.lime,
                  strokeWidth: 2.5,
                ),
              ),
              SizedBox(height: 11),
              Text(
                'Calculating mapped road fare…',
                style: TextStyle(color: Color(0xffc7cec7), fontSize: 12),
              ),
            ],
          ),
        ),
      );
}

class _EmptyFareState extends StatelessWidget {
  const _EmptyFareState();

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .035),
          border: Border.all(color: const Color(0xff343d34)),
          borderRadius: BorderRadius.circular(15),
        ),
        child: const Row(
          children: [
            Icon(
              Icons.touch_app_rounded,
              color: TriSafeColors.lime,
              size: 25,
            ),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Choose a destination first',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Tap the map, then TriSafe will calculate the official fare automatically.',
                    style: TextStyle(
                      color: Color(0xffbdc5bd),
                      fontSize: 11,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class _FareMetric extends StatelessWidget {
  final IconData icon;
  final String value;

  const _FareMetric({required this.icon, required this.value});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xff293329),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: TriSafeColors.lime, size: 15),
            const SizedBox(width: 6),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      );
}

class _StartVerifiedRideDialog extends StatelessWidget {
  final String driverName;
  final String plateNumber;
  final String vehicleType;
  final String? ownerName;
  final String? bodyNumber;
  final String? permitNumber;
  final double? averageRating;
  final int ratingCount;
  final String pickupName;
  final String pickupContext;
  final String destinationName;
  final String destinationContext;
  final String distance;
  final String duration;
  final String estimatedFare;
  final String passengerType;
  final double discountPercent;
  final double discountAmount;

  const _StartVerifiedRideDialog({
    required this.driverName,
    required this.plateNumber,
    required this.vehicleType,
    required this.ownerName,
    required this.bodyNumber,
    required this.permitNumber,
    required this.averageRating,
    required this.ratingCount,
    required this.pickupName,
    required this.pickupContext,
    required this.destinationName,
    required this.destinationContext,
    required this.distance,
    required this.duration,
    required this.estimatedFare,
    required this.passengerType,
    required this.discountPercent,
    required this.discountAmount,
  });

  @override
  Widget build(BuildContext context) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        backgroundColor: Colors.transparent,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 430,
            maxHeight: MediaQuery.sizeOf(context).height * .88,
          ),
          child: Material(
            color: const Color(0xfffbfcf8),
            borderRadius: BorderRadius.circular(28),
            clipBehavior: Clip.antiAlias,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _RideReviewHeader(
                      onClose: () => Navigator.pop(context, false)),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border.all(color: TriSafeColors.line),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Column(
                            children: [
                              _RideReviewStop(
                                icon: Icons.my_location_rounded,
                                iconColor: TriSafeColors.forest,
                                label: 'PICKUP',
                                detail: pickupContext,
                                hasConnector: true,
                              ),
                              const SizedBox(height: 10),
                              _RideReviewStop(
                                icon: Icons.flag_rounded,
                                iconColor: TriSafeColors.deepGreen,
                                label: 'DESTINATION',
                                detail: destinationContext,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        _VerifiedVehicleReviewCard(
                          driverName: driverName,
                          plateNumber: plateNumber,
                          vehicleType: vehicleType,
                          ownerName: ownerName,
                          bodyNumber: bodyNumber,
                          permitNumber: permitNumber,
                          averageRating: averageRating,
                          ratingCount: ratingCount,
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: _RideReviewMetric(
                                icon: Icons.route_rounded,
                                label: 'ROAD DISTANCE',
                                value: distance,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _RideReviewMetric(
                                icon: Icons.schedule_rounded,
                                label: 'EST. DURATION',
                                value: duration,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _RideReviewMetric(
                                icon: Icons.payments_outlined,
                                label: 'EST. FARE',
                                value: estimatedFare,
                                emphasis: true,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _PassengerFareReview(
                          passengerType: passengerType,
                          discountPercent: discountPercent,
                          discountAmount: discountAmount,
                        ),
                        const SizedBox(height: 14),
                        const _RideStartNotice(),
                        const SizedBox(height: 18),
                        Row(
                          children: [
                            Expanded(
                              child: TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                style: TextButton.styleFrom(
                                  minimumSize: const Size(0, 48),
                                  foregroundColor: TriSafeColors.forest,
                                ),
                                child: const Text('Go back'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              flex: 2,
                              child: FilledButton.icon(
                                onPressed: () => Navigator.pop(context, true),
                                style: FilledButton.styleFrom(
                                  minimumSize: const Size(0, 48),
                                ),
                                icon: const Icon(Icons.play_arrow_rounded),
                                label: const Text('Start ride'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
}

class _RideReviewHeader extends StatelessWidget {
  final VoidCallback onClose;

  const _RideReviewHeader({required this.onClose});

  @override
  Widget build(BuildContext context) => Container(
        // The confirmation headline can naturally wrap on compact phones.
        // Reserve the second line instead of clipping it in the header.
        height: 186,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xffe8f6e5), Color(0xfff7fbf2)],
          ),
        ),
        child: Stack(children: [
          const Positioned(
            right: -28,
            top: -42,
            child:
                Icon(Icons.route_rounded, size: 158, color: Color(0x1226751d)),
          ),
          Positioned(
            top: 10,
            right: 10,
            child: Semantics(
              button: true,
              label: 'Close ride review',
              child: IconButton(
                onPressed: onClose,
                tooltip: 'Close',
                style: IconButton.styleFrom(
                  minimumSize: const Size(44, 44),
                  foregroundColor: TriSafeColors.forest,
                  backgroundColor: Colors.white.withValues(alpha: .82),
                ),
                icon: const Icon(Icons.close_rounded, size: 20),
              ),
            ),
          ),
          Center(
            child: Padding(
              // Equal horizontal padding keeps this content centred in the
              // dialog; the close control floats above it rather than moving
              // the visual centre to the left.
              padding: const EdgeInsets.fromLTRB(56, 15, 56, 14),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 46,
                  height: 46,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: TriSafeColors.forest,
                    borderRadius: BorderRadius.circular(15),
                    boxShadow: const [
                      BoxShadow(
                          color: Color(0x2626751d),
                          blurRadius: 12,
                          offset: Offset(0, 5)),
                    ],
                  ),
                  child: const Icon(Icons.verified_user_rounded,
                      color: Colors.white, size: 25),
                ),
                const SizedBox(height: 8),
                const Text('LGU QR VERIFIED',
                    style: TextStyle(
                        color: TriSafeColors.forest,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1)),
                const SizedBox(height: 3),
                const Text('Ready to start your ride?',
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    style: TextStyle(
                        color: TriSafeColors.black,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -.3,
                        height: 1.12)),
                const SizedBox(height: 2),
                const Text('Review the details before live tracking begins.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: TriSafeColors.muted, fontSize: 10, height: 1.3)),
              ]),
            ),
          ),
        ]),
      );
}

class _VerifiedVehicleReviewCard extends StatelessWidget {
  final String driverName;
  final String plateNumber;
  final String vehicleType;
  final String? ownerName;
  final String? bodyNumber;
  final String? permitNumber;
  final double? averageRating;
  final int ratingCount;

  const _VerifiedVehicleReviewCard({
    required this.driverName,
    required this.plateNumber,
    required this.vehicleType,
    required this.ownerName,
    required this.bodyNumber,
    required this.permitNumber,
    required this.averageRating,
    required this.ratingCount,
  });

  @override
  Widget build(BuildContext context) {
    final isHabalHabal = vehicleType == 'HABAL_HABAL';
    final identifier = isHabalHabal ? permitNumber : bodyNumber;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xffeff7ed),
        border: Border.all(color: const Color(0xffd9e9d5)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.verified_user_rounded,
              color: TriSafeColors.forest, size: 19),
          const SizedBox(width: 8),
          const Expanded(
            child: Text('VERIFIED VEHICLE',
                style: TextStyle(
                    color: TriSafeColors.forest,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: .8)),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text(plateNumber,
                style: const TextStyle(
                    color: TriSafeColors.forest,
                    fontSize: 10,
                    fontWeight: FontWeight.w900)),
          ),
        ]),
        const SizedBox(height: 9),
        Text(driverName,
            style: const TextStyle(
                color: TriSafeColors.black,
                fontSize: 14,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 2),
        Text(_vehicleLabel(vehicleType),
            style: const TextStyle(
                color: TriSafeColors.muted,
                fontSize: 11,
                fontWeight: FontWeight.w600)),
        const Divider(height: 20, color: Color(0xffd5e4d1)),
        _VerifiedVehicleDetail(
          icon: Icons.business_rounded,
          label: 'Registered Owner / Operator',
          value: ownerName ?? 'Not recorded',
        ),
        const SizedBox(height: 8),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: _VerifiedVehicleDetail(
              icon: isHabalHabal
                  ? Icons.assignment_rounded
                  : Icons.electric_rickshaw_rounded,
              label: isHabalHabal ? 'Permit number' : 'Body number',
              value: identifier ?? 'Not recorded',
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _VerifiedVehicleDetail(
              icon: Icons.star_rounded,
              iconColor: const Color(0xffaf7400),
              label: 'Driver rating',
              value: _verifiedRatingLabel(averageRating, ratingCount),
            ),
          ),
        ]),
      ]),
    );
  }
}

class _VerifiedVehicleDetail extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String label;
  final String value;

  const _VerifiedVehicleDetail({
    required this.icon,
    required this.label,
    required this.value,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: iconColor ?? TriSafeColors.forest),
          const SizedBox(width: 7),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label,
                  style: const TextStyle(
                      color: TriSafeColors.muted,
                      fontSize: 9,
                      fontWeight: FontWeight.w600)),
              const SizedBox(height: 1),
              Text(value,
                  style: const TextStyle(
                      color: TriSafeColors.black,
                      fontSize: 11,
                      height: 1.2,
                      fontWeight: FontWeight.w900)),
            ]),
          ),
        ],
      );
}

String _verifiedRatingLabel(double? rating, int count) {
  if (rating == null || count == 0) return 'No ratings yet';
  return '${rating.toStringAsFixed(1)} / 5.0';
}

class _RideReviewStop extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String detail;
  final bool hasConnector;

  const _RideReviewStop({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.detail,
    this.hasConnector = false,
  });

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  decoration:
                      BoxDecoration(color: iconColor, shape: BoxShape.circle),
                  child: Icon(icon, color: Colors.white, size: 14),
                ),
                if (hasConnector)
                  Container(
                    width: 2,
                    height: 27,
                    margin: const EdgeInsets.only(top: 5),
                    color: TriSafeColors.line,
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: TriSafeColors.muted,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: .8)),
                const SizedBox(height: 4),
                Text(detail,
                    style: const TextStyle(
                        color: TriSafeColors.black,
                        fontSize: 11,
                        height: 1.35,
                        fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      );
}

class _RideReviewMetric extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool emphasis;

  const _RideReviewMetric({
    required this.icon,
    required this.label,
    required this.value,
    this.emphasis = false,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: emphasis ? TriSafeColors.deepGreen : Colors.white,
          border: Border.all(
              color: emphasis ? TriSafeColors.deepGreen : TriSafeColors.line),
          borderRadius: BorderRadius.circular(13),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon,
                color: emphasis ? TriSafeColors.lime : TriSafeColors.forest,
                size: 15),
            const SizedBox(height: 7),
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.fade,
                softWrap: false,
                style: TextStyle(
                    color: emphasis
                        ? const Color(0xffc1ccc1)
                        : TriSafeColors.muted,
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    letterSpacing: .35)),
            const SizedBox(height: 3),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(value,
                  style: TextStyle(
                      color: emphasis ? Colors.white : TriSafeColors.black,
                      fontSize: 13,
                      fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      );
}

class _PassengerFareReview extends StatelessWidget {
  final String passengerType;
  final double discountPercent;
  final double discountAmount;

  const _PassengerFareReview({
    required this.passengerType,
    required this.discountPercent,
    required this.discountAmount,
  });

  @override
  Widget build(BuildContext context) {
    final hasDiscount = discountAmount > 0 && discountPercent > 0;
    final isStudent = passengerType == 'STUDENT';
    final isSenior = passengerType == 'SENIOR_CITIZEN';
    final typeLabel = _passengerTypeLabel(passengerType);
    final icon = isStudent
        ? Icons.school_rounded
        : isSenior
            ? Icons.elderly_rounded
            : Icons.person_rounded;

    return Semantics(
      label: hasDiscount
          ? '$typeLabel passenger fare. ${discountPercent.toStringAsFixed(0)} percent LGU discount applied. ${discountAmount.toStringAsFixed(2)} pesos deducted. Valid identification is required at boarding.'
          : '$typeLabel passenger fare. No passenger discount applied.',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color:
              hasDiscount ? const Color(0xffeef8ea) : const Color(0xfff4f6f2),
          border: Border.all(
            color:
                hasDiscount ? const Color(0xffd1e8c9) : const Color(0xffe1e6de),
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: hasDiscount
                    ? TriSafeColors.forest
                    : const Color(0xffe3e9e1),
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(
                icon,
                color: hasDiscount ? Colors.white : TriSafeColors.forest,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$typeLabel fare'.toUpperCase(),
                    style: const TextStyle(
                      color: TriSafeColors.forest,
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      letterSpacing: .8,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    hasDiscount
                        ? '${discountPercent.toStringAsFixed(0)}% LGU discount applied · Valid ID at boarding'
                        : 'Regular LGU rate · No discount applied',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: TriSafeColors.muted,
                      fontSize: 10,
                      height: 1.25,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            if (hasDiscount) ...[
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    'DISCOUNT',
                    style: TextStyle(
                      color: TriSafeColors.muted,
                      fontSize: 8,
                      fontWeight: FontWeight.w900,
                      letterSpacing: .55,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '-₱${discountAmount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: TriSafeColors.forest,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RideStartNotice extends StatelessWidget {
  const _RideStartNotice();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xfff2f5f0),
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.shield_outlined, color: TriSafeColors.forest, size: 18),
            SizedBox(width: 9),
            Expanded(
              child: Text(
                'Starting creates a verified ride record and begins live location tracking for this trip. Your final fare uses the tracked distance and the active LGU vehicle policy.',
                style: TextStyle(
                    color: TriSafeColors.muted, fontSize: 10, height: 1.4),
              ),
            ),
          ],
        ),
      );
}

class _ResultRow extends StatelessWidget {
  final String label;
  final double value;
  final bool negative;
  const _ResultRow(
      {required this.label, required this.value, this.negative = false});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: Color(0xffbdc5bd),
                  fontSize: 11,
                ),
              ),
            ),
            Text(
              '${negative ? '-' : ''}₱${value.toStringAsFixed(2)}',
              style: TextStyle(
                color: negative ? TriSafeColors.lime : Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      );
}

class _FareNotice extends StatelessWidget {
  const _FareNotice();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .82),
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.shield_outlined,
              color: TriSafeColors.forest,
              size: 19,
            ),
            SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'How the official fare works',
                    style: TextStyle(
                      color: TriSafeColors.black,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    'This estimate uses the mapped road route. Your completed ride fare uses the tracked distance and the same active LGU vehicle policy.',
                    style: TextStyle(
                      fontSize: 11,
                      height: 1.45,
                      color: TriSafeColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

String _vehicleLabel(String value) =>
    value == 'HABAL_HABAL' ? 'Habal-Habal' : 'Tricycle';

String _passengerTypeLabel(String value) => switch (value) {
      'STUDENT' => 'Student',
      'SENIOR_CITIZEN' => 'Senior citizen',
      _ => 'Regular',
    };

String _compactDistanceLabel(double distanceKm) {
  if (distanceKm < 1) return '${(distanceKm * 1000).round()} m';
  return '${distanceKm.toStringAsFixed(2)} km';
}

String _durationLabel(double? seconds) {
  if (seconds == null || seconds <= 0) return 'time unavailable';
  return '${(seconds / 60).ceil()} min';
}

String _friendlyError(Object error, String vehicleType) {
  final message = error.toString();
  if (message.contains('No active LGU distance rate')) {
    return 'No active LGU ${_vehicleLabel(vehicleType)} rate is configured. Please contact the LGU.';
  }
  if (message.contains('No drivable road route')) {
    return 'No drivable route was found. Choose a destination located along a mapped road.';
  }
  if (message.contains('routing service')) {
    return 'The road routing service is temporarily unavailable. Please try again.';
  }
  return 'The official fare could not be calculated. Check your connection and try again.';
}

String _startRideError(Object error) {
  final message = error.toString();
  if (message.contains('active ride')) {
    return 'Complete your active ride before starting another.';
  }
  if (message.contains('LGU-issued driver QR') ||
      message.contains('eligible for rides')) {
    return 'The scanned driver is no longer eligible. Scan the official QR again.';
  }
  if (message.contains('routing service')) {
    return 'The road route could not be revalidated. Please try again.';
  }
  return 'The ride could not be started. Check your connection and try again.';
}
