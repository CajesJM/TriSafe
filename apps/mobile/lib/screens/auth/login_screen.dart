import 'package:flutter/material.dart';
import '../../services/trisafe_api.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/login_account_type_selector.dart';
import '../driver/driver_home_screen.dart';
import '../passenger/passenger_home_screen.dart';

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
  MobileAccountType accountType = MobileAccountType.passenger;

  bool get isDriver => accountType == MobileAccountType.driver;

  String get _identifierLabel =>
      isDriver ? 'Driver username' : 'Username or email address';

  String get _identifierHint => isDriver
      ? 'Example: delacruz.juan'
      : 'Enter your passenger username or email';

  String get _passwordLabel => isDriver ? 'Temporary password' : 'Password';

  String get _passwordHelp => isDriver
      ? 'Use the Body Number or Permit Number issued by the LGU.'
      : 'Use the password assigned to your passenger account.';

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
        identifier: identifierController.text,
        password: passwordController.text,
        expectedRole: isDriver ? 'DRIVER' : 'PASSENGER',
      );
      if (!mounted) {
        return;
      }
      final selectedRole = isDriver ? 'DRIVER' : 'PASSENGER';
      if (session.role != selectedRole) {
        widget.api.logout();
        throw Exception(
            'This account does not match the selected sign-in type.');
      }
      Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (_) => session.role == 'DRIVER'
              ? DriverHomeScreen(api: widget.api)
              : HomeScreen(api: widget.api, session: session)));
    } catch (exception) {
      if (mounted) {
        setState(() => error = _readableLoginError(exception));
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
      backgroundColor: TriSafeColors.offWhite,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(22, 28, 22, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _LoginWelcomeCard(isDriver: isDriver),
                    const SizedBox(height: 24),
                    LoginAccountTypeSelector(
                      selectedType: accountType,
                      onChanged: (type) => setState(() {
                        accountType = type;
                        error = null;
                        identifierController.clear();
                        passwordController.clear();
                      }),
                    ),
                    const SizedBox(height: 20),
                    _LoginRoleGuidance(isDriver: isDriver),
                    const SizedBox(height: 18),
                    if (error != null) ...[
                      _LoginErrorMessage(message: error!),
                      const SizedBox(height: 14),
                    ],
                    TextFormField(
                      controller: identifierController,
                      keyboardType: TextInputType.text,
                      textInputAction: TextInputAction.next,
                      autocorrect: false,
                      enableSuggestions: false,
                      decoration: InputDecoration(
                        labelText: _identifierLabel,
                        hintText: _identifierHint,
                        prefixIcon: Icon(isDriver
                            ? Icons.badge_outlined
                            : Icons.person_outline_rounded),
                      ),
                      validator: (value) => value == null ||
                              value.trim().isEmpty
                          ? isDriver
                              ? 'Enter the driver username issued by the LGU.'
                              : 'Enter your passenger username or email address.'
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
                        labelText: _passwordLabel,
                        helperText: _passwordHelp,
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                            onPressed: () => setState(
                                () => obscurePassword = !obscurePassword),
                            icon: Icon(obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined)),
                      ),
                      validator: (value) {
                        final password = value ?? '';
                        final minimumLength = isDriver ? 2 : 8;
                        if (password.length < minimumLength) {
                          return isDriver
                              ? 'Enter the Body Number or Permit Number issued by the LGU.'
                              : 'Password must be at least 8 characters.';
                        }
                        return null;
                      },
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
                            : Text(isDriver
                                ? 'Sign in as Driver'
                                : 'Sign in as Passenger'),
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

class _LoginWelcomeCard extends StatelessWidget {
  final bool isDriver;

  const _LoginWelcomeCard({required this.isDriver});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: TriSafeColors.black,
          borderRadius: BorderRadius.circular(25),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
                color: TriSafeColors.lime,
                borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.shield_outlined,
                color: TriSafeColors.black, size: 27),
          ),
          const SizedBox(height: 20),
          const Text('Welcome to TriSafe',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 27,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          Text(
              isDriver
                  ? 'Access your LGU-verified driver records and safety updates.'
                  : 'Verify rides and keep your journey safer.',
              style: const TextStyle(
                  color: Color(0xffcbd1cb), fontSize: 11, height: 1.45)),
        ]),
      );
}

class _LoginRoleGuidance extends StatelessWidget {
  final bool isDriver;

  const _LoginRoleGuidance({required this.isDriver});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDriver ? TriSafeColors.softGreen : const Color(0xffeef3ff),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: isDriver ? TriSafeColors.line : const Color(0xffd5e1ff)),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(
            isDriver
                ? Icons.verified_user_outlined
                : Icons.info_outline_rounded,
            color: isDriver ? TriSafeColors.forest : const Color(0xff315fa8),
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              isDriver
                  ? 'Your username is assigned by the LGU in the format lastname.firstname. Your first password is your Body Number or Permit Number.'
                  : 'Use the passenger username or email address registered by the LGU, then enter your account password.',
              style: const TextStyle(
                  fontSize: 10, height: 1.45, color: TriSafeColors.muted),
            ),
          ),
        ]),
      );
}

class _LoginErrorMessage extends StatelessWidget {
  final String message;

  const _LoginErrorMessage({required this.message});

  @override
  Widget build(BuildContext context) => Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
              color: const Color(0xffffece9),
              border: Border.all(color: const Color(0xffffc9c2)),
              borderRadius: BorderRadius.circular(15)),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.error_outline_rounded,
                color: TriSafeColors.danger, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(message,
                  style: const TextStyle(
                      fontSize: 11,
                      height: 1.4,
                      color: TriSafeColors.danger,
                      fontWeight: FontWeight.w700)),
            ),
          ]),
        ),
      );
}

String _readableLoginError(Object exception) {
  final raw = exception.toString();
  final normalized = raw.toLowerCase();
  if (normalized.contains('inactive')) {
    return 'Your account is inactive. Please contact the TriSafe support team or LGU transport office.';
  }
  if (normalized.contains('select driver') ||
      normalized.contains('select passenger')) {
    return raw
        .replaceFirst('Exception: ', '')
        .replaceFirst(RegExp(r'^TriSafe API returned \d+: '), '');
  }
  if (normalized.contains('incorrect') || normalized.contains('401')) {
    return 'The username or password is incorrect. Check the credentials issued by the LGU and try again.';
  }
  if (normalized.contains('too many login attempts') ||
      normalized.contains('429')) {
    return 'Too many sign-in attempts were made. Please wait a few minutes before trying again.';
  }
  if (normalized.contains('unavailable') || normalized.contains('timeout')) {
    return 'TriSafe cannot reach the server right now. Check your connection and try again.';
  }
  return 'Sign-in could not be completed. Please try again or contact the LGU transport office.';
}
