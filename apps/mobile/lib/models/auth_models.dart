class AuthSession {
  final String accessToken;
  final String userId;
  final String fullName;
  final String email;
  final String role;

  AuthSession.fromJson(Map<String, dynamic> json)
      : accessToken = json['accessToken'] as String,
        userId = json['user']['id'] as String,
        fullName = json['user']['fullName'] as String,
        email = json['user']['email'] as String,
        role = json['user']['role'] as String;
}
