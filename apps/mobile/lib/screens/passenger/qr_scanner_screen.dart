import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../services/qr_parser.dart';
import '../../theme/trisafe_theme.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController controller = MobileScannerController();
  String? scanError;
  bool completed = false;
  bool torchOn = false;

  void handleCapture(BarcodeCapture capture) {
    if (completed || capture.barcodes.isEmpty) return;
    final rawValue = capture.barcodes.first.rawValue;
    if (rawValue == null) return;
    final token = parseTriSafeQrToken(rawValue);
    if (token == null) {
      if (scanError == null) {
        setState(() =>
            scanError = 'This is not an official TriSafe vehicle QR code.');
      }
      return;
    }
    completed = true;
    Navigator.of(context).pop(token);
  }

  Future<void> _toggleTorch() async {
    await controller.toggleTorch();
    if (mounted) setState(() => torchOn = !torchOn);
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.black,
        body: Stack(fit: StackFit.expand, children: [
          MobileScanner(controller: controller, onDetect: handleCapture),
          const Positioned.fill(
              child: CustomPaint(painter: _ScannerMaskPainter())),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) => Stack(children: [
                Positioned(
                  top: 12,
                  left: 16,
                  right: 16,
                  child: Row(children: [
                    _ScannerControl(
                      icon: Icons.arrow_back_rounded,
                      label: 'Close scanner',
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('SCAN VEHICLE QR',
                              style: TextStyle(
                                  color: TriSafeColors.lime,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1)),
                          SizedBox(height: 2),
                          Text('LGU verification',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ),
                    _ScannerControl(
                      icon: torchOn
                          ? Icons.flash_on_rounded
                          : Icons.flash_off_rounded,
                      label: torchOn
                          ? 'Turn flashlight off'
                          : 'Turn flashlight on',
                      active: torchOn,
                      onPressed: _toggleTorch,
                    ),
                  ]),
                ),
                Positioned(
                  top: constraints.maxHeight * .47 - 125,
                  left: 0,
                  right: 0,
                  child: const Center(child: _ScanFrame()),
                ),
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 16,
                  child: _ScannerInstructions(error: scanError),
                ),
              ]),
            ),
          ),
        ]),
      );
}

class _ScannerControl extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onPressed;

  const _ScannerControl({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.active = false,
  });

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        child: IconButton(
          onPressed: onPressed,
          tooltip: label,
          style: IconButton.styleFrom(
            minimumSize: const Size(48, 48),
            backgroundColor: active
                ? TriSafeColors.lime
                : Colors.black.withValues(alpha: .56),
            foregroundColor: active ? TriSafeColors.black : Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          icon: Icon(icon, size: 22),
        ),
      );
}

class _ScanFrame extends StatelessWidget {
  const _ScanFrame();

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 250,
        height: 250,
        child: CustomPaint(
          painter: _ScanFramePainter(),
          child: const Center(
            child: Icon(Icons.qr_code_scanner_rounded,
                color: Color(0x56ffffff), size: 54),
          ),
        ),
      );
}

class _ScannerInstructions extends StatelessWidget {
  final String? error;

  const _ScannerInstructions({this.error});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xef101510),
          border: Border.all(color: Colors.white.withValues(alpha: .12)),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(children: [
          const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.center_focus_strong_rounded,
                size: 18, color: TriSafeColors.lime),
            SizedBox(width: 8),
            Text('Place the full QR code inside the frame',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 5),
          const Text(
            'Keep your phone steady and avoid glare for the fastest scan.',
            textAlign: TextAlign.center,
            style:
                TextStyle(color: Color(0xffbdc6bd), fontSize: 11, height: 1.35),
          ),
          if (error != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xff72201d),
                borderRadius: BorderRadius.circular(12),
              ),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.error_outline_rounded,
                    color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(error!,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 11, height: 1.35)),
                ),
              ]),
            ),
          ],
        ]),
      );
}

class _ScannerMaskPainter extends CustomPainter {
  const _ScannerMaskPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height * .47),
      width: 250,
      height: 250,
    );
    final cutout = RRect.fromRectAndRadius(rect, const Radius.circular(26));
    canvas.saveLayer(Offset.zero & size, Paint());
    canvas.drawRect(Offset.zero & size,
        Paint()..color = Colors.black.withValues(alpha: .46));
    canvas.drawRRect(cutout, Paint()..blendMode = BlendMode.clear);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ScanFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = TriSafeColors.lime
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const inset = 8.0;
    const length = 34.0;
    void corner(Offset fromA, Offset fromB, Offset fromC) {
      canvas.drawLine(fromA, fromB, paint);
      canvas.drawLine(fromB, fromC, paint);
    }

    corner(const Offset(inset, inset + length), const Offset(inset, inset),
        const Offset(inset + length, inset));
    corner(
        Offset(size.width - inset - length, inset),
        Offset(size.width - inset, inset),
        Offset(size.width - inset, inset + length));
    corner(
        Offset(inset, size.height - inset - length),
        Offset(inset, size.height - inset),
        Offset(inset + length, size.height - inset));
    corner(
        Offset(size.width - inset - length, size.height - inset),
        Offset(size.width - inset, size.height - inset),
        Offset(size.width - inset, size.height - inset - length));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
