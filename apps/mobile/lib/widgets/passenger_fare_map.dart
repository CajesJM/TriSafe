import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models/fare_models.dart';
import '../theme/trisafe_theme.dart';

class PassengerFareMap extends StatefulWidget {
  final LatLng? currentLocation;
  final LatLng? destination;
  final List<FareRoutePoint> routeCoordinates;
  final ValueChanged<LatLng> onDestinationSelected;
  final VoidCallback onLocate;
  final bool locating;

  const PassengerFareMap({
    super.key,
    required this.currentLocation,
    required this.destination,
    required this.routeCoordinates,
    required this.onDestinationSelected,
    required this.onLocate,
    required this.locating,
  });

  @override
  State<PassengerFareMap> createState() => _PassengerFareMapState();
}

class _PassengerFareMapState extends State<PassengerFareMap> {
  static final _boholBounds = LatLngBounds(
    southwest: LatLng(9.20, 123.45),
    northeast: LatLng(10.30, 124.78),
  );
  static const _fallback = LatLng(9.6996, 124.0276);

  GoogleMapController? _controller;

  @override
  void didUpdateWidget(covariant PassengerFareMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_controller != null &&
        widget.currentLocation != null &&
        widget.currentLocation != oldWidget.currentLocation) {
      _controller!.animateCamera(
        CameraUpdate.newLatLngZoom(widget.currentLocation!, 16),
      );
    }
  }

  void _recenter() {
    final location = widget.currentLocation;
    if (location != null) {
      _controller?.animateCamera(CameraUpdate.newLatLngZoom(location, 16));
    }
    widget.onLocate();
  }

  @override
  Widget build(BuildContext context) {
    final current = widget.currentLocation;
    final destination = widget.destination;
    final route = widget.routeCoordinates
        .map((point) => LatLng(point.latitude, point.longitude))
        .toList(growable: false);

    return ClipRRect(
      borderRadius: BorderRadius.circular(17),
      child: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: current ?? _fallback,
              zoom: current == null ? 10.4 : 16,
            ),
            cameraTargetBounds: CameraTargetBounds(_boholBounds),
            minMaxZoomPreference: const MinMaxZoomPreference(9.5, 20),
            mapType: MapType.normal,
            compassEnabled: false,
            mapToolbarEnabled: false,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            zoomGesturesEnabled: true,
            scrollGesturesEnabled: true,
            // This map sits inside the Fare tab's vertical ListView. Accept
            // map gestures eagerly so pan and pinch are not claimed by that
            // parent scroll view first.
            gestureRecognizers: {
              Factory<OneSequenceGestureRecognizer>(
                () => EagerGestureRecognizer(),
              ),
            },
            onMapCreated: (controller) => _controller = controller,
            onTap: current == null ? null : widget.onDestinationSelected,
            markers: {
              if (current != null)
                Marker(
                  markerId: const MarkerId('current-location'),
                  position: current,
                  anchor: const Offset(.5, .5),
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueGreen,
                  ),
                  infoWindow: const InfoWindow(title: 'Your pickup location'),
                ),
              if (destination != null)
                Marker(
                  markerId: const MarkerId('destination'),
                  position: destination,
                  anchor: const Offset(.5, .5),
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueOrange,
                  ),
                  infoWindow: const InfoWindow(title: 'Destination'),
                ),
            },
            polylines: route.isEmpty
                ? const {}
                : {
                    Polyline(
                      polylineId: const PolylineId('fare-route-outline'),
                      points: route,
                      width: 8,
                      color: Colors.white,
                    ),
                    Polyline(
                      polylineId: const PolylineId('fare-route'),
                      points: route,
                      width: 4,
                      color: const Color(0xff1a73e8),
                    ),
                  },
          ),
          Positioned(
            top: 12,
            left: 12,
            right: 72,
            child: IgnorePointer(
              child:
                  _MapInstruction(current: current, destination: destination),
            ),
          ),
          Positioned(
            top: 12,
            right: 12,
            child: Tooltip(
              message: 'Use my current location',
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: widget.locating ? null : _recenter,
                  borderRadius: BorderRadius.circular(24),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(13),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x26000000),
                          blurRadius: 9,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: widget.locating
                        ? const SizedBox(
                            width: 17,
                            height: 17,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(
                            Icons.my_location_rounded,
                            color: TriSafeColors.forest,
                            size: 17,
                          ),
                  ),
                ),
              ),
            ),
          ),
          if (current == null)
            Positioned.fill(
              child: Container(
                color: TriSafeColors.black.withValues(alpha: .64),
                alignment: Alignment.center,
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.location_off_outlined,
                        color: Colors.white, size: 38),
                    const SizedBox(height: 10),
                    const Text('Enable location to continue',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 16)),
                    const SizedBox(height: 5),
                    const Text(
                      'TriSafe uses your current position only to calculate this estimate and support ride safety.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Color(0xffd4d9d4), fontSize: 11, height: 1.45),
                    ),
                    const SizedBox(height: 14),
                    FilledButton.icon(
                      onPressed: widget.locating ? null : widget.onLocate,
                      style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 48)),
                      icon: const Icon(Icons.near_me_outlined),
                      label: const Text('Enable location'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MapInstruction extends StatelessWidget {
  final LatLng? current;
  final LatLng? destination;

  const _MapInstruction({required this.current, required this.destination});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .94),
          borderRadius: BorderRadius.circular(12),
          boxShadow: const [
            BoxShadow(color: Color(0x1f000000), blurRadius: 14)
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              destination == null
                  ? Icons.touch_app_rounded
                  : Icons.flag_rounded,
              color: TriSafeColors.forest,
              size: 13,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                current == null
                    ? 'Enable location to begin'
                    : destination == null
                        ? 'Tap the map to set your destination'
                        : 'Tap elsewhere to move the destination',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: TriSafeColors.black,
                  fontSize: 9,
                  height: 1.25,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      );
}
