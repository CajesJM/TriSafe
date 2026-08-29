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
  // TriSafe operates in Bohol. This small buffer keeps the island readable on
  // phone screens while preventing world-level navigation and tile loading.
  static final LatLngBounds _boholBounds = LatLngBounds(
    const LatLng(9.20, 123.45),
    const LatLng(10.30, 124.78),
  );

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
    // Trinidad is the service area's practical overview fallback before the
    // passenger grants location access.
    const fallback = LatLng(9.6996, 124.0276);
    return ClipRRect(
      borderRadius: BorderRadius.circular(17),
      child: Stack(children: [
        FlutterMap(
          mapController: controller,
          options: MapOptions(
            initialCenter: current ?? fallback,
            initialZoom: current == null ? 10.4 : 16,
            minZoom: 9.5,
            maxZoom: 20,
            // Constraining the camera's centre keeps the passenger in Bohol
            // without requiring every edge of a small phone viewport to fit
            // inside the bounds. The latter can fail during a map rebuild.
            cameraConstraint:
                CameraConstraint.containCenter(bounds: _boholBounds),
            onMapReady: () => mapReady = true,
            onTap: current == null
                ? null
                : (_, point) => widget.onDestinationSelected(point),
          ),
          children: [
            TileLayer(
              // CARTO's legacy raster endpoint now responds with an API-key
              // message. Use the standard OpenStreetMap tile endpoint for the
              // public, no-key development map instead.
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'ph.gov.bohol.trisafe',
              retinaMode: RetinaMode.isHighDensity(context),
              maxNativeZoom: 19,
              maxZoom: 20,
              tileDisplay: const TileDisplay.instantaneous(),
            ),
            if (roadRoute.isNotEmpty)
              PolylineLayer(polylines: [
                Polyline(
                  points: roadRoute,
                  strokeWidth: 8,
                  color: Colors.white.withValues(alpha: .86),
                ),
                Polyline(
                  points: roadRoute,
                  strokeWidth: 4,
                  color: TriSafeColors.forest,
                ),
              ]),
            MarkerLayer(markers: [
              if (current != null)
                Marker(
                  point: current,
                  width: 48,
                  height: 48,
                  child: const _MapPin(
                    icon: Icons.my_location_rounded,
                    color: TriSafeColors.deepGreen,
                    label: 'YOU',
                  ),
                ),
              if (destination != null)
                Marker(
                  point: destination,
                  width: 48,
                  height: 48,
                  child: const _MapPin(
                    icon: Icons.flag_rounded,
                    color: TriSafeColors.black,
                    label: 'DESTINATION',
                  ),
                ),
            ]),
          ],
        ),
        Positioned(
          top: 12,
          left: 12,
          right: 72,
          child: IgnorePointer(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
              decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .94),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(color: Color(0x1f000000), blurRadius: 14)
                  ]),
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
            ),
          ),
        ),
        if (current != null)
          Positioned(
            left: 12,
            bottom: 18,
            child: _MapStatusChip(
              icon: roadRoute.isNotEmpty
                  ? Icons.alt_route_rounded
                  : Icons.my_location_rounded,
              label: roadRoute.isNotEmpty
                  ? 'Bohol road route ready'
                  : 'Bohol pickup location',
            ),
          ),
        // Keep the required map-data credit visible without Flutter Map's
        // expandable attribution button covering the route.
        Positioned(
          right: 8,
          bottom: 8,
          child: IgnorePointer(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .62),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                '© OpenStreetMap',
                style: TextStyle(
                  color: Color(0xff596459),
                  fontSize: 8,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
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
                borderRadius: BorderRadius.circular(22),
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: Center(
                    child: _RecenterControl(locating: widget.locating),
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
                        color: Color(0xffd4d9d4), fontSize: 11, height: 1.45)),
                const SizedBox(height: 14),
                FilledButton.icon(
                    onPressed: widget.locating ? null : widget.onLocate,
                    style:
                        FilledButton.styleFrom(minimumSize: const Size(0, 48)),
                    icon: const Icon(Icons.near_me_outlined),
                    label: const Text('Enable location')),
              ]),
            ),
          ),
      ]),
    );
  }
}

class _RecenterControl extends StatelessWidget {
  final bool locating;

  const _RecenterControl({required this.locating});

  @override
  Widget build(BuildContext context) => Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(11),
          boxShadow: const [
            BoxShadow(
                color: Color(0x26000000), blurRadius: 7, offset: Offset(0, 2)),
          ],
        ),
        alignment: Alignment.center,
        child: locating
            ? const SizedBox(
                width: 15,
                height: 15,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(
                Icons.my_location_rounded,
                color: TriSafeColors.forest,
                size: 16,
              ),
      );
}

class _MapPin extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;

  const _MapPin({
    required this.icon,
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) => Semantics(
        label: label,
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Color(0x38000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Container(
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            child: Icon(icon, color: Colors.white, size: 19),
          ),
        ),
      );
}

class _MapStatusChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MapStatusChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
          decoration: BoxDecoration(
            color: TriSafeColors.black.withValues(alpha: .88),
            borderRadius: BorderRadius.circular(99),
            boxShadow: const [
              BoxShadow(
                color: Color(0x2e000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: TriSafeColors.lime, size: 12),
              const SizedBox(width: 4),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      );
}
