import 'package:flutter/material.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger_page_header.dart';

class PassengerScannerTab extends StatelessWidget {
  final bool scanning;
  final VoidCallback onScan;

  const PassengerScannerTab(
      {super.key, required this.scanning, required this.onScan});

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.fromLTRB(18, 24, 18, 112), children: [
        const PassengerPageHeader(
            eyebrow: 'LIVE LGU VERIFICATION',
            title: 'Scan vehicle QR',
            description:
                'Check the driver, vehicle, franchise, account, and QR status before boarding.'),
        const SizedBox(height: 20),
        Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
                color: TriSafeColors.black,
                borderRadius: BorderRadius.circular(24)),
            child: Column(children: [
              Container(
                  width: 126,
                  height: 126,
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24)),
                  child: Stack(alignment: Alignment.center, children: [
                    const Icon(Icons.qr_code_2_rounded,
                        color: TriSafeColors.black, size: 80),
                    Positioned.fill(
                        child: CustomPaint(painter: _CornerPainter()))
                  ])),
              const SizedBox(height: 18),
              Text(scanning ? 'Opening secure scanner…' : 'Ready to verify',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.w900)),
              const SizedBox(height: 6),
              const Text(
                  'Only QR codes issued through the TriSafe LGU registry are accepted.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: Color(0xffbdc6bd), fontSize: 11, height: 1.45)),
              const SizedBox(height: 18),
              SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                      onPressed: scanning ? null : onScan,
                      style: FilledButton.styleFrom(
                          backgroundColor: TriSafeColors.lime,
                          foregroundColor: TriSafeColors.black),
                      icon: scanning
                          ? const SizedBox(
                              width: 17,
                              height: 17,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.center_focus_strong_rounded),
                      label: Text(scanning ? 'Opening…' : 'Open QR scanner'))),
            ])),
        const SizedBox(height: 16),
        const _ScannerGuide(),
      ]);
}

class _ScannerGuide extends StatelessWidget {
  const _ScannerGuide();
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(17),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('A safer scan in 3 steps',
                style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 14),
            _step('1', 'Find the LGU-issued QR displayed on the vehicle.'),
            _step('2', 'Center the full code inside the camera frame.'),
            _step('3', 'Review every status before planning your ride.')
          ])));
  Widget _step(String number, String text) => Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Row(children: [
        Container(
            width: 25,
            height: 25,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
                color: TriSafeColors.softGreen, shape: BoxShape.circle),
            child: Text(number,
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: TriSafeColors.forest))),
        const SizedBox(width: 10),
        Expanded(
            child:
                Text(text, style: const TextStyle(fontSize: 11, height: 1.4)))
      ]));
}

class _CornerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = TriSafeColors.lime
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const length = 22.0;
    const inset = 9.0;
    canvas.drawLine(
        const Offset(inset, inset + length), const Offset(inset, inset), paint);
    canvas.drawLine(
        const Offset(inset, inset), const Offset(inset + length, inset), paint);
    canvas.drawLine(Offset(size.width - inset - length, inset),
        Offset(size.width - inset, inset), paint);
    canvas.drawLine(Offset(size.width - inset, inset),
        Offset(size.width - inset, inset + length), paint);
    canvas.drawLine(Offset(inset, size.height - inset - length),
        Offset(inset, size.height - inset), paint);
    canvas.drawLine(Offset(inset, size.height - inset),
        Offset(inset + length, size.height - inset), paint);
    canvas.drawLine(Offset(size.width - inset - length, size.height - inset),
        Offset(size.width - inset, size.height - inset), paint);
    canvas.drawLine(Offset(size.width - inset, size.height - inset),
        Offset(size.width - inset, size.height - inset - length), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
