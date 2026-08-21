import 'package:flutter/material.dart';
import '../../models/terms_models.dart';
import '../../services/trisafe_api.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';

class DriverAccountSettingsScreen extends StatelessWidget {
  final TriSafeApi api;
  final Future<void> Function() onLogout;

  const DriverAccountSettingsScreen({
    super.key,
    required this.api,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: TriSafeColors.offWhite,
        appBar: AppBar(title: const Text('Account settings')),
        body: SafeArea(
          top: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
            children: [
              const DriverPageHeader(
                eyebrow: 'ACCOUNT & APP',
                title: 'Account settings',
                description:
                    'Manage your password and review the official TriSafe application information.',
              ),
              const SizedBox(height: 18),
              const _SectionLabel('SECURITY'),
              const SizedBox(height: 8),
              _SettingsCard(
                icon: Icons.lock_reset_rounded,
                iconColor: TriSafeColors.forest,
                iconBackground: TriSafeColors.softGreen,
                title: 'Change password',
                subtitle:
                    'Use a new password with at least 8 characters, including a letter and number.',
                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => DriverChangePasswordScreen(api: api))),
              ),
              const SizedBox(height: 20),
              const _SectionLabel('LEGAL & PRIVACY'),
              const SizedBox(height: 8),
              _SettingsCard(
                icon: Icons.description_outlined,
                iconColor: TriSafeColors.forest,
                iconBackground: TriSafeColors.softGreen,
                title: 'Terms & conditions',
                subtitle: 'Read the current terms published by the LGU.',
                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => DriverTermsScreen(api: api))),
              ),
              const SizedBox(height: 10),
              _SettingsCard(
                icon: Icons.privacy_tip_outlined,
                iconColor: const Color(0xff155a64),
                iconBackground: const Color(0xffe7f6f5),
                title: 'Privacy policy',
                subtitle:
                    'Understand how TriSafe handles transport and account data.',
                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => const DriverPrivacyPolicyScreen())),
              ),
              const SizedBox(height: 20),
              const _SectionLabel('APPLICATION'),
              const SizedBox(height: 8),
              _SettingsCard(
                icon: Icons.info_outline_rounded,
                iconColor: const Color(0xff855c00),
                iconBackground: const Color(0xfffff2cf),
                title: 'About TriSafe',
                subtitle:
                    'Transportation Safety and Verification System for Trinidad, Bohol.',
                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => const DriverAboutScreen())),
              ),
              const SizedBox(height: 26),
              OutlinedButton.icon(
                onPressed: () async => onLogout(),
                style: OutlinedButton.styleFrom(
                    foregroundColor: TriSafeColors.danger),
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Sign out of TriSafe'),
              ),
            ],
          ),
        ),
      );
}

class DriverChangePasswordScreen extends StatefulWidget {
  final TriSafeApi api;
  const DriverChangePasswordScreen({super.key, required this.api});

  @override
  State<DriverChangePasswordScreen> createState() =>
      _DriverChangePasswordScreenState();
}

class _DriverChangePasswordScreenState
    extends State<DriverChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmation = TextEditingController();
  bool _saving = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirmation = true;
  String? _error;

  @override
  void dispose() {
    _currentPassword.dispose();
    _newPassword.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.api.changePassword(
        currentPassword: _currentPassword.text,
        newPassword: _newPassword.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Password changed successfully.'),
          backgroundColor: TriSafeColors.forest));
      Navigator.pop(context);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _readableError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: TriSafeColors.offWhite,
        appBar: AppBar(title: const Text('Change password')),
        body: SafeArea(
          top: false,
          child: Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
              children: [
                const DriverPageHeader(
                  eyebrow: 'ACCOUNT SECURITY',
                  title: 'Create a new password',
                  description:
                      'Confirm your current password before choosing a stronger new password.',
                ),
                const SizedBox(height: 18),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(children: [
                      if (_error != null) ...[
                        _ErrorMessage(_error!),
                        const SizedBox(height: 14),
                      ],
                      _PasswordField(
                        controller: _currentPassword,
                        label: 'Current password',
                        obscure: _obscureCurrent,
                        onToggle: () =>
                            setState(() => _obscureCurrent = !_obscureCurrent),
                        validator: (value) => value == null || value.isEmpty
                            ? 'Enter your current password.'
                            : null,
                      ),
                      const SizedBox(height: 14),
                      _PasswordField(
                        controller: _newPassword,
                        label: 'New password',
                        obscure: _obscureNew,
                        onToggle: () =>
                            setState(() => _obscureNew = !_obscureNew),
                        helper:
                            'At least 8 characters with at least one letter and one number.',
                        validator: (value) {
                          if (value == null || value.length < 8) {
                            return 'Use at least 8 characters.';
                          }
                          if (!RegExp(r'[A-Za-z]').hasMatch(value) ||
                              !RegExp(r'\d').hasMatch(value) ||
                              value.contains(RegExp(r'\s'))) {
                            return 'Include a letter and number, without spaces.';
                          }
                          if (value == _currentPassword.text) {
                            return 'Your new password must be different.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      _PasswordField(
                        controller: _confirmation,
                        label: 'Confirm new password',
                        obscure: _obscureConfirmation,
                        onToggle: () => setState(
                            () => _obscureConfirmation = !_obscureConfirmation),
                        validator: (value) => value != _newPassword.text
                            ? 'New passwords do not match.'
                            : null,
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _saving ? null : _save,
                          icon: const Icon(Icons.lock_reset_rounded),
                          label: Text(_saving
                              ? 'Saving new password…'
                              : 'Update password'),
                        ),
                      ),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class DriverTermsScreen extends StatelessWidget {
  final TriSafeApi api;
  const DriverTermsScreen({super.key, required this.api});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: TriSafeColors.offWhite,
        appBar: AppBar(title: const Text('Terms & conditions')),
        body: FutureBuilder<PublishedTermsDocument?>(
          future: api.currentTerms(),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return const _DocumentMessage(
                  icon: Icons.cloud_off_outlined,
                  title: 'Terms could not be loaded',
                  message:
                      'Check your internet connection and try again later.');
            }
            final terms = snapshot.data;
            if (terms == null) {
              return const _DocumentMessage(
                  icon: Icons.description_outlined,
                  title: 'No published terms yet',
                  message:
                      'The LGU has not published an active Terms & Conditions document.');
            }
            return ListView(
              padding: const EdgeInsets.fromLTRB(18, 20, 18, 28),
              children: [
                const DriverPageHeader(
                    eyebrow: 'OFFICIAL POLICY',
                    title: 'Terms & conditions',
                    description:
                        'The current policy document published by the LGU.'),
                const SizedBox(height: 18),
                _PolicyCard(
                  title: terms.title,
                  version: terms.version,
                  effectiveDate: terms.effectiveFrom ?? terms.publishedAt,
                  content: terms.content,
                ),
              ],
            );
          },
        ),
      );
}

class DriverPrivacyPolicyScreen extends StatelessWidget {
  const DriverPrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: TriSafeColors.offWhite,
        appBar: AppBar(title: const Text('Privacy policy')),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 20, 18, 28),
          children: const [
            DriverPageHeader(
              eyebrow: 'PRIVACY & DATA',
              title: 'TriSafe privacy policy',
              description:
                  'How the system handles account, transport, and safety information.',
            ),
            SizedBox(height: 18),
            _PolicyCard(
              title: 'TriSafe Privacy Policy',
              version: 'Version 1.0',
              content:
                  '''TriSafe uses account information to provide verified transport, fare, ride, and safety features in Trinidad, Bohol. This may include official account and contact information, ride records, QR verification information, and—in the case of registered drivers—vehicle and franchise records.

Location data is used only for the safety and ride features that require it, such as ride verification, SafeShare, and emergency assistance. Location access depends on the permissions you allow on your device.

The LGU/BPLO may access the official records needed to administer the transport program, including driver, vehicle, franchise, incident, notification, and operational records. Passenger feedback is shown to drivers without revealing passenger identity.

TriSafe does not sell personal information. Information is retained and handled according to applicable LGU procedures and Philippine data-protection requirements. Contact the LGU/BPLO transport office for questions about your records or this policy.''',
            ),
          ],
        ),
      );
}

class DriverAboutScreen extends StatelessWidget {
  const DriverAboutScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: TriSafeColors.offWhite,
        appBar: AppBar(title: const Text('About TriSafe')),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 20, 18, 28),
          children: [
            const DriverPageHeader(
              eyebrow: 'TRISAFE APPLICATION',
              title: 'Safer verified transport',
              description:
                  'Transportation Safety and Verification System for Trinidad, Bohol.',
            ),
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(children: const [
                  Icon(Icons.verified_user_rounded,
                      size: 48, color: TriSafeColors.forest),
                  SizedBox(height: 14),
                  Text('TriSafe',
                      style:
                          TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                  SizedBox(height: 5),
                  Text('Mobile application · Version 1.0',
                      style:
                          TextStyle(fontSize: 10, color: TriSafeColors.muted)),
                  Divider(height: 30),
                  Text(
                    'TriSafe helps the LGU, registered drivers, and passengers use verified QR-based transport records, transparent fares, and safety-focused communication.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 12,
                        height: 1.55,
                        color: TriSafeColors.charcoal),
                  ),
                  SizedBox(height: 15),
                  Text(
                    'Municipality of Trinidad, Bohol',
                    style: TextStyle(
                        color: TriSafeColors.forest,
                        fontSize: 10,
                        fontWeight: FontWeight.w900),
                  ),
                ]),
              ),
            ),
          ],
        ),
      );
}

class _SettingsCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBackground;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _SettingsCard({
    required this.icon,
    required this.iconColor,
    required this.iconBackground,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Card(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(
                  width: 43,
                  height: 43,
                  decoration: BoxDecoration(
                      color: iconBackground,
                      borderRadius: BorderRadius.circular(13)),
                  child: Icon(icon, color: iconColor, size: 21)),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(title,
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(subtitle,
                        style: const TextStyle(
                            fontSize: 10,
                            height: 1.4,
                            color: TriSafeColors.muted)),
                  ])),
              const Icon(Icons.chevron_right_rounded,
                  color: TriSafeColors.muted),
            ]),
          ),
        ),
      );
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
          color: TriSafeColors.forest,
          fontSize: 9,
          letterSpacing: 1,
          fontWeight: FontWeight.w900));
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? helper;
  final bool obscure;
  final VoidCallback onToggle;
  final String? Function(String?) validator;
  const _PasswordField({
    required this.controller,
    required this.label,
    required this.obscure,
    required this.onToggle,
    required this.validator,
    this.helper,
  });

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        obscureText: obscure,
        enableSuggestions: false,
        autocorrect: false,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          helperText: helper,
          prefixIcon: const Icon(Icons.lock_outline_rounded),
          suffixIcon: IconButton(
            onPressed: onToggle,
            tooltip: obscure ? 'Show password' : 'Hide password',
            icon: Icon(obscure
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined),
          ),
        ),
      );
}

class _PolicyCard extends StatelessWidget {
  final String title;
  final String version;
  final DateTime? effectiveDate;
  final String content;
  const _PolicyCard({
    required this.title,
    required this.version,
    required this.content,
    this.effectiveDate,
  });

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            Text(
                effectiveDate == null
                    ? version
                    : '$version · Effective ${_date(effectiveDate!)}',
                style: const TextStyle(
                    color: TriSafeColors.muted,
                    fontSize: 10,
                    fontWeight: FontWeight.w700)),
            const Divider(height: 28),
            ...content
                .split(RegExp(r'\n\s*\n'))
                .where((paragraph) => paragraph.trim().isNotEmpty)
                .map((paragraph) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Text(paragraph.trim(),
                          style: const TextStyle(
                              fontSize: 12,
                              height: 1.6,
                              color: TriSafeColors.charcoal)),
                    )),
          ]),
        ),
      );
}

class _DocumentMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  const _DocumentMessage(
      {required this.icon, required this.title, required this.message});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(icon, color: TriSafeColors.forest, size: 40),
                const SizedBox(height: 12),
                Text(title,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                Text(message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 10, color: TriSafeColors.muted)),
              ]),
            ),
          ),
        ),
      );
}

class _ErrorMessage extends StatelessWidget {
  final String message;
  const _ErrorMessage(this.message);
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: const Color(0xffffeeee),
            borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          const Icon(Icons.error_outline_rounded,
              color: TriSafeColors.danger, size: 18),
          const SizedBox(width: 8),
          Expanded(
              child: Text(message,
                  style: const TextStyle(
                      color: TriSafeColors.danger, fontSize: 10))),
        ]),
      );
}

String _readableError(Object error) {
  final text = error.toString();
  if (text.contains('current password is incorrect')) {
    return 'Your current password is incorrect.';
  }
  if (text.contains('different from your current')) {
    return 'Choose a new password that is different from your current password.';
  }
  return 'Your password could not be updated. Please try again.';
}

String _date(DateTime value) =>
    '${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')}/${value.year}';
