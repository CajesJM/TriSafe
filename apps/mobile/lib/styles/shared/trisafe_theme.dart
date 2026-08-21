import 'package:flutter/material.dart';

abstract final class TriSafeColors {
  static const black = Color(0xff0f0f0f);
  static const charcoal = Color(0xff202020);
  static const lime = Color(0xff5dd62c);
  static const forest = Color(0xff337418);
  static const deepGreen = Color(0xff185449);
  static const offWhite = Color(0xfff8f8f8);
  static const softGreen = Color(0xffeef8e9);
  static const muted = Color(0xff68736a);
  static const line = Color(0xffdce4d9);
  static const danger = Color(0xffa52323);
}

ThemeData buildTriSafeTheme() {
  final colors = ColorScheme.fromSeed(
    seedColor: TriSafeColors.lime,
    brightness: Brightness.light,
    primary: TriSafeColors.forest,
    surface: TriSafeColors.offWhite,
    error: TriSafeColors.danger,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: colors,
    scaffoldBackgroundColor: const Color(0xfff4f6f3),
    fontFamily: 'Arial',
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
          fontSize: 27,
          height: 1.1,
          fontWeight: FontWeight.w900,
          color: TriSafeColors.black),
      titleLarge: TextStyle(
          fontSize: 19,
          fontWeight: FontWeight.w800,
          color: TriSafeColors.black),
      titleMedium: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w800,
          color: TriSafeColors.charcoal),
      bodyMedium:
          TextStyle(fontSize: 13, height: 1.45, color: TriSafeColors.muted),
      labelLarge: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: Colors.white,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: TriSafeColors.line),
        borderRadius: BorderRadius.circular(18),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 15),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: TriSafeColors.line)),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: TriSafeColors.line)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide:
              const BorderSide(color: TriSafeColors.forest, width: 1.5)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 46),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
        side: const BorderSide(color: TriSafeColors.line),
      ),
    ),
  );
}
