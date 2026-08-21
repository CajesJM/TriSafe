import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'services/trisafe_api.dart';
import 'screens/auth/login_screen.dart';
import 'theme/trisafe_theme.dart';

void main() => runApp(const TriSafeApp());

const configuredApiBaseUrl = String.fromEnvironment('API_BASE_URL');

String get apiBaseUrl {
  if (configuredApiBaseUrl.isNotEmpty) return configuredApiBaseUrl;
  return kIsWeb ? 'http://localhost:3000/api' : 'http://10.0.2.2:3000/api';
}

class TriSafeApp extends StatelessWidget {
  const TriSafeApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'TriSafe',
        debugShowCheckedModeBanner: false,
        theme: buildTriSafeTheme(),
        home: LoginScreen(api: TriSafeApi(baseUrl: apiBaseUrl)),
      );
}
