import 'package:flutter/material.dart';
import '../models/fare_models.dart';
import '../models/vehicle_models.dart';
import '../services/trisafe_api.dart';
import 'fare_confirmation_screen.dart';

class RouteSelectionScreen extends StatefulWidget {
  final TriSafeApi api;
  final VerifiedVehicle vehicle;

  const RouteSelectionScreen(
      {super.key, required this.api, required this.vehicle});

  @override
  State<RouteSelectionScreen> createState() => _RouteSelectionScreenState();
}

class _RouteSelectionScreenState extends State<RouteSelectionScreen> {
  List<LocationOption> locations = [];
  LocationOption? from;
  LocationOption? to;
  int passengerCount = 1;
  String? error;
  bool loading = true;
  bool calculating = false;

  @override
  void initState() {
    super.initState();
    _loadLocations();
  }

  Future<void> _loadLocations() async {
    try {
      final available = await widget.api.locations();
      if (!mounted) {
        return;
      }
      setState(() {
        locations = available;
        from = available.isNotEmpty ? available.first : null;
        to = available.length > 1 ? available[1] : null;
        loading = false;
      });
    } catch (exception) {
      if (mounted) {
        setState(() {
          error = exception.toString();
          loading = false;
        });
      }
    }
  }

  Future<void> _reviewFare() async {
    if (from == null || to == null || from!.id == to!.id) {
      setState(() => error = 'Choose two different locations for your trip.');
      return;
    }
    setState(() {
      calculating = true;
      error = null;
    });
    try {
      final fare = await widget.api.estimateFare(
          vehicleId: widget.vehicle.vehicleId,
          fromLocationId: from!.id,
          toLocationId: to!.id,
          passengerCount: passengerCount);
      if (!mounted) {
        return;
      }
      final plan = await Navigator.of(context).push<RidePlan>(MaterialPageRoute(
          builder: (_) => FareConfirmationScreen(
              vehicle: widget.vehicle,
              from: from!,
              to: to!,
              fare: fare,
              passengerCount: passengerCount)));
      if (plan != null && mounted) {
        Navigator.of(context).pop(plan);
      }
    } catch (exception) {
      if (mounted) {
        setState(() => error = exception.toString());
      }
    } finally {
      if (mounted) {
        setState(() => calculating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(title: const Text('Plan your ride')),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(padding: const EdgeInsets.all(20), children: [
                const Text('Where are you going?',
                    style:
                        TextStyle(fontSize: 27, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(
                    'Official fare estimates are based on the LGU fare matrix.',
                    style: TextStyle(color: Colors.grey.shade700)),
                const SizedBox(height: 22),
                Card(
                    child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(children: [
                          const Icon(Icons.verified, color: Color(0xff3b7a43)),
                          const SizedBox(width: 10),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                const Text('Verified vehicle',
                                    style: TextStyle(fontSize: 12)),
                                Text(
                                    '${widget.vehicle.driverName} · ${widget.vehicle.plateNumber}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700))
                              ]))
                        ]))),
                if (error != null)
                  Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: Text(error!,
                          style: TextStyle(color: Colors.red.shade700))),
                const SizedBox(height: 16),
                _LocationField(
                    label: 'From',
                    icon: Icons.trip_origin,
                    value: from,
                    locations: locations,
                    onChanged: (value) => setState(() => from = value)),
                const SizedBox(height: 14),
                _LocationField(
                    label: 'To',
                    icon: Icons.location_on,
                    value: to,
                    locations: locations,
                    onChanged: (value) => setState(() => to = value)),
                const SizedBox(height: 22),
                Card(
                    child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                        child: Row(children: [
                          const Expanded(
                              child: Text('Passengers',
                                  style:
                                      TextStyle(fontWeight: FontWeight.w700))),
                          IconButton(
                              onPressed: passengerCount > 1
                                  ? () => setState(() => passengerCount--)
                                  : null,
                              icon: const Icon(Icons.remove_circle_outline)),
                          Text('$passengerCount',
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.w800)),
                          IconButton(
                              onPressed: passengerCount < 8
                                  ? () => setState(() => passengerCount++)
                                  : null,
                              icon: const Icon(Icons.add_circle_outline))
                        ]))),
                const SizedBox(height: 24),
                SizedBox(
                    height: 52,
                    child: FilledButton.icon(
                        onPressed: calculating ? null : _reviewFare,
                        icon: calculating
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.receipt_long),
                        label: Text(calculating
                            ? 'Calculating…'
                            : 'Review official fare'))),
              ]));
  }
}

class _LocationField extends StatelessWidget {
  final String label;
  final IconData icon;
  final LocationOption? value;
  final List<LocationOption> locations;
  final ValueChanged<LocationOption?> onChanged;

  const _LocationField(
      {required this.label,
      required this.icon,
      required this.value,
      required this.locations,
      required this.onChanged});

  @override
  Widget build(BuildContext context) => InputDecorator(
      decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          border: const OutlineInputBorder()),
      child: DropdownButtonHideUnderline(
          child: DropdownButton<LocationOption>(
              isExpanded: true,
              value: value,
              items: locations
                  .map((location) => DropdownMenuItem(
                      value: location, child: Text(location.name)))
                  .toList(),
              onChanged: onChanged)));
}
