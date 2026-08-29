import 'package:flutter/material.dart';

import '../shared/app_layout_styles.dart';
import '../shared/trisafe_theme.dart';

abstract final class PassengerDashboardStyles {
  static const EdgeInsets screenPadding = AppLayoutStyles.mobileScreenPadding;
  static const double metricGap = 10;
  static const double headerIconSize = 42;

  static final BoxDecoration headerActionDecoration = BoxDecoration(
    color: TriSafeColors.black,
    borderRadius: BorderRadius.circular(AppLayoutStyles.controlRadius),
  );

  /// A restrained, layered surface that gives the greeting an intentional
  /// starting point without competing with the ride-safety card below it.
  static final BoxDecoration greetingSurfaceDecoration = BoxDecoration(
    gradient: const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xfffbfffa), Color(0xffe7f5df)],
    ),
    borderRadius: BorderRadius.circular(24),
    border: Border.all(color: const Color(0xffd5e8ce)),
    boxShadow: const [
      BoxShadow(
        color: Color(0x120d2d17),
        blurRadius: 22,
        offset: Offset(0, 10),
      ),
    ],
  );

  static const LinearGradient dashboardBackground = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xfff5faf2), Color(0xfff8faf7), Color(0xfff2f7f0)],
  );
}
