import 'package:flutter/material.dart';

/// Shared layout values for native Flutter screens.
///
/// Flutter does not use CSS on Android. Keeping these reusable values outside
/// widgets provides the same separation of structure and presentation that the
/// Admin application's CSS folders provide.
abstract final class AppLayoutStyles {
  static const EdgeInsets mobileScreenPadding =
      EdgeInsets.fromLTRB(18, 24, 18, 112);
  static const EdgeInsets dialogPadding = EdgeInsets.all(20);
  static const EdgeInsets cardPadding = EdgeInsets.all(16);

  static const double compactGap = 8;
  static const double contentGap = 14;
  static const double sectionGap = 20;
  static const double pageGap = 24;

  static const double cardRadius = 18;
  static const double panelRadius = 22;
  static const double controlRadius = 13;
}
