class AuthSession {
  final String accessToken;
  final String userId;
  final String fullName;
  final String? email;
  final String role;
  final String? username;
  final String? phone;
  final String status;

  AuthSession.fromJson(Map<String, dynamic> json)
      : accessToken = json['accessToken'] as String,
        userId = json['user']['id'] as String,
        fullName = json['user']['fullName'] as String,
        email = json['user']['email'] as String?,
        role = json['user']['role'] as String,
        username = json['user']['username'] as String?,
        phone = json['user']['phone'] as String?,
        status = json['user']['status'] as String;
}

class PassengerProfile {
  final String id;
  final String fullName;
  final String? username;
  final String? email;
  final String? phone;
  final String role;
  final String status;
  final String? avatarData;

  PassengerProfile.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        fullName = json['fullName'] as String,
        username = json['username'] as String?,
        email = json['email'] as String?,
        phone = json['phone'] as String?,
        role = json['role'] as String,
        status = json['status'] as String,
        avatarData = json['avatarData'] as String?;

  PassengerProfile.fromSession(AuthSession session)
      : id = session.userId,
        fullName = session.fullName,
        username = session.username,
        email = session.email,
        phone = session.phone,
        role = session.role,
        status = session.status,
        avatarData = null;
}
