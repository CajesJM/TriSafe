import 'package:flutter/material.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger_page_header.dart';

class PassengerScannerTab extends StatelessWidget {
  final bool scanning;
  final VoidCallback onScan;

  const PassengerScannerTab({
    super.key,
    required this.scanning,
    required this.onScan,
  });

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
        children: [
          const PassengerPageHeader(
            eyebrow: 'LGU-ISSUED VEHICLE RECORD',
            title: 'Verify before you ride',
            description:
                'Scan the QR displayed on the vehicle to check its registered driver and LGU status.',
          ),
          const SizedBox(height: 20),
          _ScannerLaunchCard(scanning: scanning, onScan: onScan),
          const SizedBox(height: 16),
          const _ScannerGuide(),
          const SizedBox(height: 14),
          const _ScannerTrustNote(),
        ],
      );
}

class _ScannerLaunchCard extends StatelessWidget {
  final bool scanning;
  final VoidCallback onScan;

  const _ScannerLaunchCard({required this.scanning, required this.onScan});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(20, 19, 20, 20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xff101912), Color(0xff1a3d26)],
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1e18391d),
              blurRadius: 20,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Column(children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .1),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: Colors.white.withValues(alpha: .12)),
              ),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.verified_user_rounded,
                    size: 14, color: TriSafeColors.lime),
                SizedBox(width: 6),
                Text(
                  'SECURE LGU CHECK',
                  style: TextStyle(
                    color: Color(0xffdbe9d9),
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: .8,
                  ),
                ),
              ]),
            ),
            const Spacer(),
            Icon(Icons.lock_outline_rounded,
                size: 17, color: Colors.white.withValues(alpha: .64)),
          ]),
          const SizedBox(height: 18),
          Container(
            width: 142,
            height: 142,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x26000000),
                  blurRadius: 18,
                  offset: Offset(0, 9),
                ),
              ],
            ),
            child: Stack(alignment: Alignment.center, children: [
              const Icon(Icons.qr_code_2_rounded,
                  color: TriSafeColors.black, size: 86),
              Positioned.fill(child: CustomPaint(painter: _CornerPainter())),
              Positioned(
                right: 10,
                bottom: 10,
                child: Container(
                  width: 25,
                  height: 25,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: TriSafeColors.forest,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_rounded,
                      size: 15, color: Colors.white),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 18),
          Text(
            scanning ? 'Opening secure scanner…' : 'Ready to verify a vehicle',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              height: 1.15,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Only official TriSafe QR codes are checked against the active LGU registry.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xffc4d2c5),
              fontSize: 11,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: scanning ? null : onScan,
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 52),
                backgroundColor: TriSafeColors.lime,
                foregroundColor: TriSafeColors.black,
              ),
              icon: scanning
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: TriSafeColors.black,
                      ),
                    )
                  : const Icon(Icons.center_focus_strong_rounded, size: 21),
              label: Text(scanning ? 'Opening scanner…' : 'Scan vehicle QR'),
            ),
          ),
        ]),
      );
}

class _ScannerGuide extends StatelessWidget {
  const _ScannerGuide();

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Row(children: [
              Icon(Icons.tips_and_updates_outlined,
                  color: TriSafeColors.forest, size: 20),
              SizedBox(width: 9),
              Text(
                'How to scan safely',
                style: TextStyle(
                  color: TriSafeColors.black,
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ]),
            const SizedBox(height: 17),
            const _GuideStep(
              number: '01',
              title: 'Find the official QR',
              description:
                  'Use the code displayed on the vehicle or by its driver.',
            ),
            const _GuideStep(
              number: '02',
              title: 'Keep the full code in frame',
              description:
                  'Avoid glare and hold your phone steady for a moment.',
            ),
            const _GuideStep(
              number: '03',
              title: 'Review before boarding',
              description:
                  'Check the verified driver, vehicle, franchise, and QR status.',
              isLast: true,
            ),
          ]),
        ),
      );
}

class _GuideStep extends StatelessWidget {
  final String number;
  final String title;
  final String description;
  final bool isLast;

  const _GuideStep({
    required this.number,
    required this.title,
    required this.description,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(bottom: isLast ? 0 : 15),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            width: 34,
            child: Column(children: [
              Container(
                width: 30,
                height: 30,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: TriSafeColors.softGreen,
                  shape: BoxShape.circle,
                ),
                child: Text(number,
                    style: const TextStyle(
                        color: TriSafeColors.forest,
                        fontSize: 9,
                        fontWeight: FontWeight.w900)),
              ),
              if (!isLast)
                Container(
                  width: 1,
                  height: 29,
                  margin: const EdgeInsets.only(top: 4),
                  color: TriSafeColors.line,
                ),
            ]),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            color: TriSafeColors.charcoal,
                            fontSize: 12,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(description,
                        style: const TextStyle(
                            color: TriSafeColors.muted,
                            fontSize: 11,
                            height: 1.35)),
                  ]),
            ),
          ),
        ]),
      );
}

class _ScannerTrustNote extends StatelessWidget {
  const _ScannerTrustNote();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xffedf7ea),
          border: Border.all(color: const Color(0xffd6e9d1)),
          borderRadius: BorderRadius.circular(16),
        ),
        child:
            const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.shield_outlined, color: TriSafeColors.forest, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Scanning verifies the vehicle record with the LGU registry before you continue to fare planning.',
              style: TextStyle(
                  color: TriSafeColors.muted,
                  fontSize: 11,
                  height: 1.4,
                  fontWeight: FontWeight.w600),
            ),
          ),
        ]),
      );
}

class _CornerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = TriSafeColors.lime
      ..strokeWidth = 3.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const length = 22.0;
    const inset = 10.0;
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
