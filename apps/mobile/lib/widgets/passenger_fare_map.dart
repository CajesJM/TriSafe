import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
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
  final MapController controller = MapController();
  bool mapReady = false;

  @override
  void didUpdateWidget(covariant PassengerFareMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (mapReady &&
        widget.currentLocation != null &&
        widget.currentLocation != oldWidget.currentLocation) {
      controller.move(widget.currentLocation!, 16);
    }
  }

  void _recenter() {
    final location = widget.currentLocation;
    if (location != null && mapReady) controller.move(location, 16);
    widget.onLocate();
  }

  @override
  Widget build(BuildContext context) {
    final current = widget.currentLocation;
    final destination = widget.destination;
    final roadRoute = widget.routeCoordinates
        .map((point) => LatLng(point.latitude, point.longitude))
        .toList();
    const fallback = LatLng(9.6996, 124.0276);
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Stack(children: [
        FlutterMap(
          mapController: controller,
          options: MapOptions(
            initialCenter: current ?? fallback,
            initialZoom: current == null ? 13 : 16,
            minZoom: 4,
            maxZoom: 19,
            onMapReady: () => mapReady = true,
            onTap: current == null
                ? null
                : (_, point) => widget.onDestinationSelected(point),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'ph.gov.bohol.trisafe',
            ),
            if (current != null && destination != null)
              PolylineLayer(polylines: [
                Polyline(
                    points: roadRoute.isNotEmpty
                        ? roadRoute
                        : [current, destination],
                    strokeWidth: 4,
                    color: TriSafeColors.forest),
              ]),
            MarkerLayer(markers: [
              if (current != null)
                Marker(
                  point: current,
                  width: 52,
                  height: 52,
                  child: const _MapPin(
                      icon: Icons.my_location_rounded,
                      color: TriSafeColors.deepGreen),
                ),
              if (destination != null)
                Marker(
                  point: destination,
                  width: 52,
                  height: 52,
                  child: const _MapPin(
                      icon: Icons.flag_rounded, color: TriSafeColors.black),
                ),
            ]),
            const RichAttributionWidget(
              showFlutterMapAttribution: false,
              attributions: [
                TextSourceAttribution('OpenStreetMap contributors')
              ],
            ),
          ],
        ),
        Positioned(
          top: 12,
          left: 12,
          right: 68,
          child: IgnorePointer(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .94),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(color: Color(0x1f000000), blurRadius: 14)
                  ]),
              child: Text(
                current == null
                    ? 'Location is required to estimate a fare'
                    : destination == null
                        ? 'Tap the map to choose your destination'
                        : 'Destination selected — tap elsewhere to change it',
                style:
                    const TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ),
        Positioned(
          top: 12,
          right: 12,
          child: Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(13),
            elevation: 3,
            child: IconButton(
              onPressed: widget.locating ? null : _recenter,
              tooltip: 'Use my current location',
              icon: widget.locating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.my_location_rounded,
                      color: TriSafeColors.forest),
            ),
          ),
        ),
        if (current == null)
          Positioned.fill(
            child: Container(
              color: TriSafeColors.black.withValues(alpha: .64),
              alignment: Alignment.center,
              padding: const EdgeInsets.all(28),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
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
                        color: Color(0xffd4d9d4), fontSize: 10, height: 1.45)),
                const SizedBox(height: 14),
                FilledButton.icon(
                    onPressed: widget.locating ? null : widget.onLocate,
                    icon: const Icon(Icons.near_me_outlined),
                    label: const Text('Enable location')),
              ]),
            ),
          ),
      ]),
    );
  }
}

class _MapPin extends StatelessWidget {
  final IconData icon;
  final Color color;
  const _MapPin({required this.icon, required this.color});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 3),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x30000000),
                  blurRadius: 10,
                  offset: Offset(0, 4))
            ]),
        child: Icon(icon, color: color, size: 22),
      );
}
