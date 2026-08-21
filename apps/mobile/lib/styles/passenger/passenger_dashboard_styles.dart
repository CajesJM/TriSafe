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
}
