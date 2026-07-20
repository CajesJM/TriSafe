import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/qr_parser.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController controller = MobileScannerController();
  String? scanError;
  bool completed = false;

  void handleCapture(BarcodeCapture capture) {
    if (completed || capture.barcodes.isEmpty) {
      return;
    }
    final rawValue = capture.barcodes.first.rawValue;
    if (rawValue == null) {
      return;
    }
    final token = parseTriSafeQrToken(rawValue);
    if (token == null) {
      if (scanError == null) {
        setState(() => scanError = 'This is not a TriSafe vehicle QR code.');
      }
      return;
    }
    completed = true;
    Navigator.of(context).pop(token);
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Scan vehicle QR'),
        foregroundColor: Colors.white,
        backgroundColor: Colors.black,
        actions: [
          IconButton(
              onPressed: () => controller.toggleTorch(),
              icon: const Icon(Icons.flash_on))
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(controller: controller, onDetect: handleCapture),
          Center(
              child: Container(
                  width: 245,
                  height: 245,
                  decoration: BoxDecoration(
                      border:
                          Border.all(color: const Color(0xffe3f5b8), width: 3),
                      borderRadius: BorderRadius.circular(20)))),
          Positioned(
              left: 24,
              right: 24,
              bottom: 34,
              child: Column(children: [
                const Text('Place the LGU-issued QR inside the frame',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                if (scanError != null)
                  Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                          color: Colors.red.shade900.withValues(alpha: .9),
                          borderRadius: BorderRadius.circular(9)),
                      child: Text(scanError!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white))),
              ])),
        ],
      ),
    );
  }
}
