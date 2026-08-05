import 'package:flutter/material.dart';
import 'services/trisafe_api.dart';
import 'screens/login_screen.dart';
import 'theme/trisafe_theme.dart';

void main() => runApp(const TriSafeApp());

const apiBaseUrl = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api');

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
