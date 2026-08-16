import 'package:flutter/material.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';
import '../../widgets/driver_status_badge.dart';

class DriverVehicleTab extends StatelessWidget {
  final DriverProfile? profile;
  final VoidCallback onOpenQr;

  const DriverVehicleTab(
      {super.key, required this.profile, required this.onOpenQr});

  @override
  Widget build(BuildContext context) {
    final vehicles = profile?.vehicles ?? const <DriverVehicle>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
      children: [
        const DriverPageHeader(
            eyebrow: 'LGU VEHICLE REGISTRY',
            title: 'Vehicle information',
            description:
                'View the vehicles officially registered under your TriSafe driver account.'),
        const SizedBox(height: 18),
        if (vehicles.isEmpty)
          const _NoVehicle()
        else
          ...vehicles.asMap().entries.map((entry) => _VehicleCard(
              vehicle: entry.value, number: entry.key + 1, onOpenQr: onOpenQr)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
              color: TriSafeColors.softGreen,
              border: Border.all(color: TriSafeColors.line),
              borderRadius: BorderRadius.circular(16)),
          child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.admin_panel_settings_outlined,
                    color: TriSafeColors.forest, size: 21),
                SizedBox(width: 10),
                Expanded(
                    child: Text(
                        'Vehicle identity and registration details are managed by the LGU. Contact the transport office if you changed vehicles or found incorrect information.',
                        style: TextStyle(
                            fontSize: 10,
                            height: 1.5,
                            color: TriSafeColors.muted))),
              ]),
        ),
      ],
    );
  }
}

class _VehicleCard extends StatelessWidget {
  final DriverVehicle vehicle;
  final int number;
  final VoidCallback onOpenQr;
  const _VehicleCard(
      {required this.vehicle, required this.number, required this.onOpenQr});

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                    color: TriSafeColors.black,
                    borderRadius: BorderRadius.circular(16)),
                child: Icon(
                    vehicle.vehicleType == 'HABAL_HABAL'
                        ? Icons.two_wheeler_rounded
                        : Icons.electric_rickshaw_rounded,
                    color: TriSafeColors.lime,
                    size: 27),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(vehicle.plateNumber,
                          style: const TextStyle(
                              fontSize: 19, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 2),
                      Text(_vehicleLabel(vehicle.vehicleType),
                          style: const TextStyle(
                              fontSize: 11, color: TriSafeColors.muted)),
                    ]),
              ),
              DriverStatusBadge(
                  status: vehicle.isActive ? 'ACTIVE' : 'INACTIVE',
                  compact: true),
            ]),
            const Divider(height: 30),
            _VehicleRow(label: 'Registry number', value: 'Vehicle $number'),
            _VehicleRow(label: 'Plate number', value: vehicle.plateNumber),
            _VehicleRow(
                label: 'Vehicle type',
                value: _vehicleLabel(vehicle.vehicleType)),
            _VehicleRow(
                label: 'Make / model',
                value: vehicle.makeModel ?? 'Not recorded'),
            _VehicleRow(
                label: 'LGU QR status',
                value: vehicle.qrCode == null
                    ? 'Not generated'
                    : vehicle.qrCode!.revokedAt == null
                        ? 'Generated and active'
                        : 'Revoked'),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                  onPressed: vehicle.qrCode == null ? null : onOpenQr,
                  icon: const Icon(Icons.qr_code_2_rounded),
                  label: const Text('View assigned QR code')),
            ),
          ]),
        ),
      );
}

class _VehicleRow extends StatelessWidget {
  final String label;
  final String value;
  const _VehicleRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
            width: 120,
            child: Text(label,
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted))),
        Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w800))),
      ]));
}

class _NoVehicle extends StatelessWidget {
  const _NoVehicle();
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(children: const [
            Icon(Icons.no_transfer_rounded,
                size: 38, color: TriSafeColors.muted),
            SizedBox(height: 10),
            Text('No registered vehicle',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            SizedBox(height: 5),
            Text('Contact the LGU transport office to register a vehicle.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ])));
}

String _vehicleLabel(String value) =>
    value == 'HABAL_HABAL' ? 'Habal-habal' : 'Tricycle';
