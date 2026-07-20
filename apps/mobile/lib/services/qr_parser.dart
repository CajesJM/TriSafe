String? parseTriSafeQrToken(String rawValue) {
  final uri = Uri.tryParse(rawValue.trim());
  if (uri == null ||
      uri.scheme != 'trisafe' ||
      uri.host != 'verify' ||
      uri.pathSegments.length != 1) {
    return null;
  }
  final token = uri.pathSegments.single.trim();
  return token.isEmpty ? null : token;
}
