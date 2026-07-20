import 'package:flutter/material.dart';
import '../models/vehicle_models.dart';

class VerifiedVehicleCard extends StatelessWidget {
  final VerifiedVehicle vehicle;
  final VoidCallback? onContinue;

  const VerifiedVehicleCard(
      {super.key, required this.vehicle, required this.onContinue});

  @override
  Widget build(BuildContext context) => Card(
        color: const Color(0xffe4f3db),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Row(children: [
              Icon(Icons.verified, color: Color(0xff3b7a43)),
              SizedBox(width: 7),
              Text('Verified by TriSafe',
                  style: TextStyle(fontWeight: FontWeight.bold))
            ]),
            const SizedBox(height: 12),
            Text(vehicle.driverName,
                style:
                    const TextStyle(fontSize: 21, fontWeight: FontWeight.w800)),
            Text('${vehicle.vehicleType} · ${vehicle.plateNumber}'),
            Text('Franchise ${vehicle.franchiseNumber}'),
            const SizedBox(height: 13),
            SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                    onPressed: onContinue,
                    icon: const Icon(Icons.route),
                    label: const Text('Plan your ride'))),
          ]),
        ),
      );
}
