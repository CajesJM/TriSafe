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
  double dragOffset = 0;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => visible = true);
    });
    timer = Timer(const Duration(seconds: 5), dismiss);
  }

  void dismiss() {
    if (!mounted || !visible) return;
    setState(() => visible = false);
    Timer(const Duration(milliseconds: 260), widget.onDismiss);
  }

  void _handleVerticalDragUpdate(DragUpdateDetails details) {
    if (!visible || details.delta.dy >= 0) return;
    setState(() {
      dragOffset =
          (dragOffset + details.delta.dy / 90).clamp(-.48, 0).toDouble();
    });
  }

  void _handleVerticalDragEnd(DragEndDetails details) {
    final movedFarEnough = dragOffset <= -.18;
    final flickedUpward = (details.primaryVelocity ?? 0) < -260;
    if (movedFarEnough || flickedUpward) {
      dismiss();
      return;
    }
    setState(() => dragOffset = 0);
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    final motionDuration =
        reduceMotion ? Duration.zero : const Duration(milliseconds: 220);
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
        alignment: Alignment.topCenter,
        child: AnimatedSlide(
          duration: motionDuration,
          curve: Curves.easeOutCubic,
          offset:
              visible ? Offset(0, dragOffset) : Offset(0, -.28 + dragOffset),
          child: AnimatedOpacity(
            duration: motionDuration,
            opacity: visible ? 1 : 0,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onVerticalDragUpdate: _handleVerticalDragUpdate,
              onVerticalDragEnd: _handleVerticalDragEnd,
              onVerticalDragCancel: () => setState(() => dragOffset = 0),
              child: Semantics(
                liveRegion: true,
                label: '${widget.message}. Swipe up to dismiss.',
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 318),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 13, vertical: 10),
                    decoration: BoxDecoration(
                      color: background,
                      border: Border.all(color: color.withValues(alpha: .25)),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x1a000000),
                          blurRadius: 18,
                          offset: Offset(0, 7),
                        ),
                      ],
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(icon, color: color, size: 18),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          widget.message,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: color,
                            fontSize: 11,
                            height: 1.3,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ]),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
