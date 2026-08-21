import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../models/driver_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_status_badge.dart';

class DriverQrFullScreen extends StatelessWidget {
  final DriverVehicle vehicle;
  final DriverQrCode qrCode;
  final bool isEligible;

  const DriverQrFullScreen({
    super.key,
    required this.vehicle,
    required this.qrCode,
    required this.isEligible,
  });

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: TriSafeColors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          title: const Text('My LGU QR code'),
        ),
        body: SafeArea(
          top: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 34),
                child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('OFFICIAL LGU-ISSUED QR',
                          style: TextStyle(
                              color: TriSafeColors.lime,
                              letterSpacing: 1.2,
                              fontSize: 10,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 8),
                      Text(vehicle.plateNumber,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 27,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 12),
                      DriverStatusBadge(
                          status: isEligible ? 'ACTIVE' : 'INACTIVE'),
                      const SizedBox(height: 28),
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(28)),
                        child: QrImageView(
                          data: 'trisafe://verify/${qrCode.token}',
                          version: QrVersions.auto,
                          size: 290,
                          padding: EdgeInsets.zero,
                          eyeStyle: const QrEyeStyle(
                              eyeShape: QrEyeShape.square,
                              color: TriSafeColors.black),
                          dataModuleStyle: const QrDataModuleStyle(
                              dataModuleShape: QrDataModuleShape.square,
                              color: TriSafeColors.black),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        isEligible
                            ? 'Ask the passenger to scan this code before the ride begins.'
                            : 'This QR is not currently eligible for verified rides. Contact the LGU transport office.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            color: Color(0xffcbd1cb),
                            fontSize: 11,
                            height: 1.45),
                      ),
                      const SizedBox(height: 10),
                      const Text('View-only · controlled by the LGU',
                          style:
                              TextStyle(color: Color(0xff8f988f), fontSize: 9)),
                    ]),
              ),
            ),
          ),
        ),
      );
}
