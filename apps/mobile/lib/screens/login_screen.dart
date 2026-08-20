import 'package:flutter/material.dart';
import '../services/trisafe_api.dart';
import 'driver_home_screen.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  final TriSafeApi api;

  const LoginScreen({super.key, required this.api});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final identifierController = TextEditingController();
  final passwordController = TextEditingController();
  final formKey = GlobalKey<FormState>();
  bool submitting = false;
  bool obscurePassword = true;
  String? error;

  @override
  void dispose() {
    identifierController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!formKey.currentState!.validate()) {
      return;
    }
    setState(() {
      submitting = true;
      error = null;
    });

    try {
      final session = await widget.api.login(
          identifier: identifierController.text, password: passwordController.text);
      if (!mounted) {
        return;
      }
      if (session.role != 'PASSENGER' && session.role != 'DRIVER') {
        widget.api.logout();
        throw Exception(
            'Administrator accounts must sign in through the TriSafe Admin Portal.');
      }
      Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (_) => session.role == 'DRIVER'
              ? DriverHomeScreen(api: widget.api)
              : HomeScreen(api: widget.api, session: session)));
    } catch (exception) {
      if (mounted) {
        setState(() => error = exception.toString());
      }
    } finally {
      if (mounted) {
        setState(() => submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                          color: const Color(0xff185449),
                          borderRadius: BorderRadius.circular(18)),
                      child: const Icon(Icons.shield_outlined,
                          color: Colors.white, size: 30),
                    ),
                    const SizedBox(height: 28),
                    const Text('Welcome to TriSafe',
                        style: TextStyle(
                            fontSize: 30, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 8),
                    Text('Sign in to verify rides and keep your journey safer.',
                        style: TextStyle(color: Colors.grey.shade700)),
                    const SizedBox(height: 30),
                    if (error != null)
                      Card(
                        color: Colors.red.shade50,
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Text(error!,
                              style: TextStyle(color: Colors.red.shade800)),
                        ),
                      ),
                    if (error != null) const SizedBox(height: 14),
                    TextFormField(
                      controller: identifierController,
                      keyboardType: TextInputType.text,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                          labelText: 'Email, body number, or permit number',
                          prefixIcon: Icon(Icons.badge_outlined),
                          border: OutlineInputBorder()),
                      validator: (value) => value == null || value.trim().isEmpty
                          ? 'Enter your account identifier.'
                          : value.contains(' ')
                              ? 'The login identifier cannot contain spaces.'
                              : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: passwordController,
                      obscureText: obscurePassword,
                      onFieldSubmitted: (_) => _login(),
                      decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                              onPressed: () => setState(
                                  () => obscurePassword = !obscurePassword),
                              icon: Icon(obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined)),
                          border: const OutlineInputBorder()),
                      validator: (value) => value == null || value.length < 8
                          ? 'Password must be at least 8 characters.'
                          : null,
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: FilledButton(
                        onPressed: submitting ? null : _login,
                        child: submitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : const Text('Sign in'),
                      ),
                    ),
                    const SizedBox(height: 22),
                    Center(
                      child: Text('TriSafe · Trinidad, Bohol',
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
