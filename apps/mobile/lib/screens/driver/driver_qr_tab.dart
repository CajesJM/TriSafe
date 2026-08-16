import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';
import '../../widgets/driver_status_badge.dart';

class DriverQrTab extends StatefulWidget {
  final DriverProfile? profile;
  const DriverQrTab({super.key, required this.profile});

  @override
  State<DriverQrTab> createState() => _DriverQrTabState();
}

class _DriverQrTabState extends State<DriverQrTab> {
  int selectedVehicle = 0;

  @override
  void didUpdateWidget(covariant DriverQrTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    final length = widget.profile?.vehicles.length ?? 0;
    if (selectedVehicle >= length && length > 0) selectedVehicle = 0;
  }

  @override
  Widget build(BuildContext context) {
    final vehicles = widget.profile?.vehicles ?? const <DriverVehicle>[];
    final vehicle = vehicles.isEmpty ? null : vehicles[selectedVehicle];
    final qr = vehicle?.qrCode;
    final active = vehicle?.isActive == true &&
        qr != null &&
        qr.revokedAt == null &&
        widget.profile?.verification == 'VERIFIED';
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
      children: [
        const DriverPageHeader(
            eyebrow: 'PASSENGER VERIFICATION',
            title: 'My LGU QR code',
            description:
                'Show this code to passengers so they can verify your driver, vehicle, and franchise records.'),
        const SizedBox(height: 18),
        if (vehicles.length > 1) ...[
          DropdownButtonFormField<int>(
              initialValue: selectedVehicle,
              decoration: const InputDecoration(
                  labelText: 'Registered vehicle',
                  prefixIcon: Icon(Icons.electric_rickshaw_outlined)),
              items: vehicles
                  .asMap()
                  .entries
                  .map((entry) => DropdownMenuItem(
                      value: entry.key,
                      child: Text(
                          '${entry.value.plateNumber} · ${entry.value.vehicleType}')))
                  .toList(),
              onChanged: (value) =>
                  setState(() => selectedVehicle = value ?? 0)),
          const SizedBox(height: 12),
        ],
        if (vehicle == null || qr == null)
          const _NoQrCard()
        else
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
                color: TriSafeColors.black,
                borderRadius: BorderRadius.circular(24)),
            child: Column(children: [
              Row(children: [
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      const Text('LGU-ISSUED VEHICLE QR',
                          style: TextStyle(
                              color: TriSafeColors.lime,
                              fontSize: 9,
                              letterSpacing: 1.1,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text(vehicle.plateNumber,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w900)),
                    ])),
                DriverStatusBadge(
                    status: active ? 'ACTIVE' : 'INACTIVE', compact: true),
              ]),
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20)),
                child: Center(
                  child: QrImageView(
                    data: 'trisafe://verify/${qr.token}',
                    version: QrVersions.auto,
                    size: 244,
                    padding: EdgeInsets.zero,
                    eyeStyle: const QrEyeStyle(
                        eyeShape: QrEyeShape.square,
                        color: TriSafeColors.black),
                    dataModuleStyle: const QrDataModuleStyle(
                        dataModuleShape: QrDataModuleShape.square,
                        color: TriSafeColors.black),
                  ),
                ),
              ),
              const SizedBox(height: 15),
              const Text('Ask the passenger to scan before starting the ride.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xffcbd1cb), fontSize: 10)),
              const SizedBox(height: 5),
              Text('Generated ${_dateTime(qr.generatedAt)}',
                  style:
                      const TextStyle(color: Color(0xff8f988f), fontSize: 9)),
            ]),
          ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
              color: const Color(0xfffff4df),
              border: Border.all(color: const Color(0xffffddb0)),
              borderRadius: BorderRadius.circular(16)),
          child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lock_outline_rounded,
                    color: Color(0xff8a5a00), size: 20),
                SizedBox(width: 10),
                Expanded(
                    child: Text(
                        'This QR code is view-only. Only an authorized LGU administrator can generate, replace, revoke, or download the official vehicle QR.',
                        style: TextStyle(
                            fontSize: 10,
                            height: 1.5,
                            color: Color(0xff6f500f)))),
              ]),
        ),
      ],
    );
  }
}

class _NoQrCard extends StatelessWidget {
  const _NoQrCard();
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(26),
          child: Column(children: const [
            Icon(Icons.qr_code_2_rounded, size: 48, color: TriSafeColors.muted),
            SizedBox(height: 12),
            Text('No QR code assigned',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
            SizedBox(height: 5),
            Text('Contact the LGU transport office for assistance.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ])));
}

String _dateTime(DateTime date) =>
    '${date.month}/${date.day}/${date.year} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
