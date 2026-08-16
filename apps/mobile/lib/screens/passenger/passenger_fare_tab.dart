import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../models/fare_models.dart';
import '../../models/ride_models.dart';
import '../../models/vehicle_models.dart';
import '../../services/trisafe_api.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger_fare_map.dart';
import '../../widgets/passenger_page_header.dart';

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
  int passengers = 1;
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

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      if (!mounted) return;
      setState(() =>
          currentLocation = LatLng(position.latitude, position.longitude));
      if (!locationAnnounced) {
        locationAnnounced = true;
        widget.onSuccess('Location detected successfully.');
      }
      if (destination != null) await _calculateFare(showValidation: false);
    } on TimeoutException {
      if (mounted) await _showLocationProblem(_LocationProblem.timeout);
    } catch (_) {
      if (mounted) await _showLocationProblem(_LocationProblem.unavailable);
    } finally {
      if (mounted) setState(() => locating = false);
    }
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
    } else if (problem == _LocationProblem.deniedForever) {
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
          originLatitude: origin.latitude,
          originLongitude: origin.longitude,
          destinationLatitude: selectedDestination.latitude,
          destinationLongitude: selectedDestination.longitude,
          passengerCount: passengers);
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

  void _changePassengers(int value) {
    setState(() {
      passengers = value;
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
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            icon: const Icon(Icons.route_rounded,
                color: TriSafeColors.forest, size: 34),
            title: const Text('Start this ride?'),
            content: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 390),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                _ConfirmationRow(label: 'Driver', value: vehicle.driverName),
                _ConfirmationRow(label: 'Vehicle', value: vehicle.plateNumber),
                _ConfirmationRow(
                    label: 'Road distance',
                    value: _roadDistanceLabel(estimate.distanceKm ?? 0)),
                _ConfirmationRow(
                    label: 'Estimated fare',
                    value: '₱${estimate.amount.toStringAsFixed(2)}'),
                const SizedBox(height: 10),
                const Text(
                  'Starting enables live ride tracking and creates a temporary ride session in TriSafe.',
                  style: TextStyle(fontSize: 11, color: TriSafeColors.muted),
                ),
              ]),
            ),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancel')),
              FilledButton.icon(
                  onPressed: () => Navigator.pop(context, true),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Start ride')),
            ],
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
        passengerCount: passengers,
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
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
      children: [
        const PassengerPageHeader(
          eyebrow: 'LIVE LGU FARE',
          title: 'Map fare estimation',
          description:
              'Use your current location, choose a destination, and get the latest official estimate.',
        ),
        const SizedBox(height: 18),
        _LocationStatus(
            location: currentLocation,
            locating: locating,
            onLocate: _ensureLocation),
        const SizedBox(height: 12),
        LayoutBuilder(
            builder: (context, constraints) => SizedBox(
                  height: constraints.maxWidth >= 700 ? 430 : 350,
                  child: PassengerFareMap(
                    currentLocation: currentLocation,
                    destination: destination,
                    routeCoordinates: fare?.routeCoordinates ?? const [],
                    onDestinationSelected: _selectDestination,
                    onLocate: _ensureLocation,
                    locating: locating,
                  ),
                )),
        const SizedBox(height: 14),
        LayoutBuilder(builder: (context, constraints) {
          final wide = constraints.maxWidth >= 720;
          final controls = _FareControls(
            vehicleType: vehicleType,
            passengers: passengers,
            verifiedVehicle: widget.vehicle,
            onVehicleChanged: _changeVehicleType,
            onPassengersChanged: _changePassengers,
            onScan: widget.onScan,
          );
          final result = _FareResult(
              fare: fare,
              distanceKm: distanceKm,
              calculating: calculating,
              startingRide: startingRide,
              hasVerifiedDriver:
                  widget.vehicle != null && widget.qrToken != null,
              hasActiveRide: widget.activeRide != null,
              onCalculate: _calculateFare,
              onStartRide: _startRide);
          if (!wide) {
            return Column(
                children: [controls, const SizedBox(height: 12), result]);
          }
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: controls),
            const SizedBox(width: 12),
            Expanded(child: result)
          ]);
        }),
        const SizedBox(height: 12),
        const _FareNotice(),
      ],
    );
  }
}

enum _LocationProblem {
  servicesDisabled,
  deniedForever,
  denied,
  timeout,
  unavailable
}

class _LocationStatus extends StatelessWidget {
  final LatLng? location;
  final bool locating;
  final VoidCallback onLocate;
  const _LocationStatus(
      {required this.location, required this.locating, required this.onLocate});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
            color: location == null
                ? const Color(0xfffff4e5)
                : TriSafeColors.softGreen,
            border: Border.all(
                color: location == null
                    ? const Color(0xffffd49b)
                    : TriSafeColors.line),
            borderRadius: BorderRadius.circular(15)),
        child: Row(children: [
          Icon(
              location == null
                  ? Icons.location_searching_rounded
                  : Icons.my_location_rounded,
              color: location == null
                  ? const Color(0xff9a6100)
                  : TriSafeColors.forest),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(
                    location == null
                        ? 'Current location required'
                        : 'Current location detected',
                    style: const TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                Text(
                    location == null
                        ? 'Enable location to unlock destination selection.'
                        : '${location!.latitude.toStringAsFixed(6)}, ${location!.longitude.toStringAsFixed(6)}',
                    style: const TextStyle(
                        fontSize: 9, color: TriSafeColors.muted)),
              ])),
          TextButton(
              onPressed: locating ? null : onLocate,
              child: Text(location == null ? 'Enable' : 'Refresh')),
        ]),
      );
}

class _FareControls extends StatelessWidget {
  final String vehicleType;
  final int passengers;
  final VerifiedVehicle? verifiedVehicle;
  final ValueChanged<String?> onVehicleChanged;
  final ValueChanged<int> onPassengersChanged;
  final VoidCallback onScan;
  const _FareControls(
      {required this.vehicleType,
      required this.passengers,
      required this.verifiedVehicle,
      required this.onVehicleChanged,
      required this.onPassengersChanged,
      required this.onScan});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(17),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Fare options',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            const Text('Vehicle rates are maintained by the LGU.',
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted)),
            const SizedBox(height: 15),
            DropdownButtonFormField<String>(
              initialValue: vehicleType,
              decoration: const InputDecoration(
                  labelText: 'Vehicle type',
                  prefixIcon: Icon(Icons.directions_car_outlined)),
              items: const [
                DropdownMenuItem(value: 'TRICYCLE', child: Text('Tricycle')),
                DropdownMenuItem(
                    value: 'HABAL_HABAL', child: Text('Habal-habal'))
              ],
              onChanged: verifiedVehicle == null ? onVehicleChanged : null,
            ),
            if (verifiedVehicle != null) ...[
              const SizedBox(height: 9),
              Row(children: [
                const Icon(Icons.verified_rounded,
                    size: 16, color: TriSafeColors.forest),
                const SizedBox(width: 6),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(
                          'Driver QR verified · ${verifiedVehicle!.plateNumber}',
                          style: const TextStyle(
                              fontSize: 10,
                              color: TriSafeColors.forest,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 2),
                      Text(verifiedVehicle!.driverName,
                          style: const TextStyle(
                              fontSize: 9, color: TriSafeColors.muted)),
                    ])),
                TextButton(onPressed: onScan, child: const Text('Change'))
              ]),
            ] else ...[
              const SizedBox(height: 8),
              TextButton.icon(
                  onPressed: onScan,
                  icon: const Icon(Icons.qr_code_scanner_rounded, size: 17),
                  label: const Text('Scan a vehicle for verification')),
            ],
            const Divider(height: 22),
            Row(children: [
              const Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('Passengers',
                        style: TextStyle(fontWeight: FontWeight.w800)),
                    Text('1 to 8 passengers',
                        style:
                            TextStyle(fontSize: 9, color: TriSafeColors.muted))
                  ])),
              IconButton(
                  onPressed: passengers > 1
                      ? () => onPassengersChanged(passengers - 1)
                      : null,
                  icon: const Icon(Icons.remove_circle_outline_rounded)),
              Text('$passengers',
                  style: const TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w900)),
              IconButton(
                  onPressed: passengers < 8
                      ? () => onPassengersChanged(passengers + 1)
                      : null,
                  icon: const Icon(Icons.add_circle_outline_rounded)),
            ]),
          ])));
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
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
            color: TriSafeColors.black,
            borderRadius: BorderRadius.circular(19)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('OFFICIAL ESTIMATE',
              style: TextStyle(
                  color: TriSafeColors.lime,
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.1)),
          const SizedBox(height: 10),
          if (calculating)
            const SizedBox(
                height: 70,
                child: Center(
                    child:
                        CircularProgressIndicator(color: TriSafeColors.lime)))
          else if (fare == null) ...[
            const Text('Select a destination',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 5),
            const Text(
                'Tap the map and TriSafe will calculate the fare automatically.',
                style: TextStyle(
                    color: Color(0xffbdc5bd), fontSize: 10, height: 1.4)),
          ] else ...[
            Text('₱${fare!.amount.toStringAsFixed(2)}',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 34,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            Text(
                '${_roadDistanceLabel(fare!.distanceKm ?? distanceKm ?? 0)} · ${_durationLabel(fare!.routeDurationSeconds)} · ₱${(fare!.ratePerKm ?? 0).toStringAsFixed(2)}/km',
                style: const TextStyle(
                    color: TriSafeColors.lime,
                    fontSize: 11,
                    fontWeight: FontWeight.w800)),
            const Divider(height: 24, color: Color(0xff343934)),
            _ResultRow(label: 'Base fare', value: fare!.baseFare),
            _ResultRow(label: 'Distance charge', value: fare!.distanceCharge),
            _ResultRow(
                label: 'Passenger surcharge', value: fare!.passengerSurcharge),
            const SizedBox(height: 8),
            Text('LGU matrix ${fare!.matrixVersion}',
                style: const TextStyle(color: Color(0xff9fa79f), fontSize: 9)),
          ],
          const SizedBox(height: 15),
          SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                  onPressed: calculating ? null : () => onCalculate(),
                  style: FilledButton.styleFrom(
                      backgroundColor: TriSafeColors.lime,
                      foregroundColor: TriSafeColors.black),
                  icon: const Icon(Icons.calculate_outlined),
                  label:
                      Text(fare == null ? 'Calculate fare' : 'Recalculate'))),
          if (fare != null) ...[
            const SizedBox(height: 10),
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
                        backgroundColor: Colors.white,
                        foregroundColor: TriSafeColors.black,
                        disabledBackgroundColor: const Color(0xff343934),
                        disabledForegroundColor: const Color(0xff9fa79f)),
                    icon: startingRide
                        ? const SizedBox(
                            width: 17,
                            height: 17,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.play_arrow_rounded),
                    label:
                        Text(startingRide ? 'Starting ride…' : 'Start ride'))),
            if (!hasVerifiedDriver || hasActiveRide) ...[
              const SizedBox(height: 8),
              Text(
                  hasActiveRide
                      ? 'Complete your active ride before starting another.'
                      : 'Scan an eligible driver QR to enable Start ride.',
                  style: const TextStyle(
                      color: Color(0xffbdc5bd), fontSize: 9, height: 1.35)),
            ],
          ],
        ]),
      );
}

class _ConfirmationRow extends StatelessWidget {
  final String label;
  final String value;
  const _ConfirmationRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
            width: 105,
            child: Text(label,
                style:
                    const TextStyle(fontSize: 11, color: TriSafeColors.muted))),
        Expanded(
            child: Text(value,
                textAlign: TextAlign.right,
                style: const TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w800))),
      ]));
}

class _ResultRow extends StatelessWidget {
  final String label;
  final double value;
  const _ResultRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Expanded(
            child: Text(label,
                style:
                    const TextStyle(color: Color(0xffbdc5bd), fontSize: 10))),
        Text('₱${value.toStringAsFixed(2)}',
            style: const TextStyle(
                color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800))
      ]));
}

class _FareNotice extends StatelessWidget {
  const _FareNotice();
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(15)),
      child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.info_outline_rounded, color: TriSafeColors.forest, size: 19),
        SizedBox(width: 10),
        Expanded(
            child: Text(
                'The estimate uses the mapped road route. The completed ride fare uses the tracked ride distance and the same active LGU vehicle policy.',
                style: TextStyle(
                    fontSize: 10, height: 1.5, color: TriSafeColors.muted)))
      ]));
}

String _vehicleLabel(String value) =>
    value == 'HABAL_HABAL' ? 'habal-habal' : 'tricycle';
String _roadDistanceLabel(double distanceKm) {
  if (distanceKm < 1) return '${(distanceKm * 1000).round()} m road distance';
  return '${distanceKm.toStringAsFixed(2)} km road distance';
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
