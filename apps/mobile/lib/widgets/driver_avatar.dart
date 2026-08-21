import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../theme/trisafe_theme.dart';

/// Displays the driver photo stored as a private base64 data image, with a
/// consistent initials fallback when no photo has been added.
class DriverAvatar extends StatelessWidget {
  final String fullName;
  final String? avatarData;
  final double radius;

  const DriverAvatar({
    super.key,
    required this.fullName,
    required this.avatarData,
    this.radius = 29,
  });

  @override
  Widget build(BuildContext context) {
    final photoBytes = _imageBytes(avatarData);
    return CircleAvatar(
      radius: radius,
      backgroundColor: TriSafeColors.black,
      foregroundImage: photoBytes == null ? null : MemoryImage(photoBytes),
      // CircleAvatar asserts that an image-error callback is only provided
      // when there is an actual foreground image. Passengers without a saved
      // photo use initials, so the callback must also be null in that case.
      onForegroundImageError: photoBytes == null ? null : (_, __) {},
      child: photoBytes == null
          ? Text(_initials(fullName),
              style: TextStyle(
                  color: TriSafeColors.lime,
                  fontSize: radius * .45,
                  fontWeight: FontWeight.w900))
          : null,
    );
  }
}

Uint8List? _imageBytes(String? data) {
  if (data == null || !data.startsWith('data:image/')) return null;
  final separator = data.indexOf(',');
  if (separator < 0) return null;
  try {
    return base64Decode(data.substring(separator + 1));
  } catch (_) {
    return null;
  }
}

String _initials(String name) {
  final parts = name
      .replaceAll(',', ' ')
      .split(RegExp(r'\s+'))
      .where((item) => item.isNotEmpty)
      .toList();
  if (parts.isEmpty) return 'D';
  return parts.take(2).map((item) => item[0].toUpperCase()).join();
}
