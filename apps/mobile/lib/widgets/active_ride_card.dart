import 'package:flutter/material.dart';
import '../models/ride_models.dart';

class ActiveRideCard extends StatelessWidget {
  final Ride ride;
  final VoidCallback onShare;
  final VoidCallback onEnd;

  const ActiveRideCard(
      {super.key,
      required this.ride,
      required this.onShare,
      required this.onEnd});

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Row(children: [
              Icon(Icons.trip_origin, color: Color(0xff185449)),
              SizedBox(width: 8),
              Text('Ride in progress',
                  style: TextStyle(fontWeight: FontWeight.bold))
            ]),
            const SizedBox(height: 8),
            Text(
                'Current fare: PHP ${(ride.currentFare ?? ride.estimatedFare).toStringAsFixed(2)}',
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(
                'Tracked distance: ${(ride.actualDistanceMeters / 1000).toStringAsFixed(2)} km',
                style: TextStyle(color: Colors.grey.shade700)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                  child: OutlinedButton.icon(
                      onPressed: onShare,
                      icon: const Icon(Icons.ios_share),
                      label: const Text('SafeShare'))),
              const SizedBox(width: 8),
              Expanded(
                  child: FilledButton.icon(
                      onPressed: onEnd,
                      icon: const Icon(Icons.flag),
                      label: const Text('End ride')))
            ]),
          ]),
        ),
      );
}
