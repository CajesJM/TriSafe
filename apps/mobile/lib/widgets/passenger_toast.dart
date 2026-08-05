import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/trisafe_theme.dart';

enum PassengerToastType { success, error, info }

class PassengerToast extends StatefulWidget {
  final String message;
  final PassengerToastType type;
  final VoidCallback onDismiss;

  const PassengerToast(
      {super.key,
      required this.message,
      required this.type,
      required this.onDismiss});

  @override
  State<PassengerToast> createState() => _PassengerToastState();
}

class _PassengerToastState extends State<PassengerToast> {
  bool visible = false;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => visible = true);
    });
    timer = Timer(const Duration(milliseconds: 3600), dismiss);
  }

  void dismiss() {
    if (!mounted || !visible) return;
    setState(() => visible = false);
    Timer(const Duration(milliseconds: 260), widget.onDismiss);
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final (color, background, icon) = switch (widget.type) {
      PassengerToastType.success => (
          TriSafeColors.forest,
          const Color(0xffeef8e9),
          Icons.check_circle_outline_rounded
        ),
      PassengerToastType.error => (
          TriSafeColors.danger,
          const Color(0xffffeeee),
          Icons.error_outline_rounded
        ),
      PassengerToastType.info => (
          TriSafeColors.deepGreen,
          const Color(0xffedf7f5),
          Icons.info_outline_rounded
        ),
    };
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(14, 12, 14, 0),
      child: Align(
        alignment: Alignment.topRight,
        child: AnimatedSlide(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          offset: visible ? Offset.zero : const Offset(.12, -.35),
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 220),
            opacity: visible ? 1 : 0,
            child: Material(
              color: Colors.transparent,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 380),
                padding: const EdgeInsets.fromLTRB(13, 11, 8, 11),
                decoration: BoxDecoration(
                    color: background,
                    border: Border.all(color: color.withValues(alpha: .25)),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: const [
                      BoxShadow(
                          color: Color(0x1f000000),
                          blurRadius: 24,
                          offset: Offset(0, 8))
                    ]),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(icon, color: color, size: 20),
                  const SizedBox(width: 9),
                  Flexible(
                      child: Text(widget.message,
                          style: TextStyle(
                              color: color,
                              fontSize: 12,
                              height: 1.35,
                              fontWeight: FontWeight.w700))),
                  const SizedBox(width: 5),
                  IconButton(
                      onPressed: dismiss,
                      icon: const Icon(Icons.close_rounded),
                      color: color,
                      iconSize: 17,
                      visualDensity: VisualDensity.compact,
                      tooltip: 'Dismiss'),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
