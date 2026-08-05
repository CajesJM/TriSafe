import 'package:flutter/material.dart';
import '../../models/auth_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger_page_header.dart';

class PassengerProfileTab extends StatelessWidget {
  final PassengerProfile profile;
  final int rideCount;
  final VoidCallback onLogout;

  const PassengerProfileTab(
      {super.key,
      required this.profile,
      required this.rideCount,
      required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final name = _parseName(profile.fullName);
    return ListView(
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
        children: [
          const PassengerPageHeader(
              eyebrow: 'ACCOUNT',
              title: 'Passenger profile',
              description:
                  'Your identity information is loaded securely from the TriSafe database.'),
          const SizedBox(height: 20),
          Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                  color: TriSafeColors.black,
                  borderRadius: BorderRadius.circular(22)),
              child: Row(children: [
                Container(
                    width: 68,
                    height: 68,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: TriSafeColors.lime,
                        borderRadius: BorderRadius.circular(21)),
                    child: Text(_initials(profile.fullName),
                        style: const TextStyle(
                            fontSize: 21,
                            fontWeight: FontWeight.w900,
                            color: TriSafeColors.black))),
                const SizedBox(width: 15),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(profile.fullName,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text('@${profile.username ?? 'username-not-set'}',
                          style: const TextStyle(
                              color: Color(0xffbac3ba), fontSize: 11)),
                      const SizedBox(height: 9),
                      _StatusBadge(active: profile.status == 'ACTIVE')
                    ])),
              ])),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(
                child:
                    _AccountMetric(value: '$rideCount', label: 'Ride records')),
            const SizedBox(width: 10),
            Expanded(
                child: _AccountMetric(
                    value:
                        profile.status == 'ACTIVE' ? 'Enabled' : 'Restricted',
                    label: 'Login access'))
          ]),
          const SizedBox(height: 20),
          const Text('Personal information',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 11),
          Card(
              child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 17, vertical: 5),
                  child: Column(children: [
                    _ProfileRow(
                        icon: Icons.badge_outlined,
                        label: 'Last name',
                        value: name.lastName),
                    _ProfileRow(
                        icon: Icons.person_outline_rounded,
                        label: 'First name',
                        value: name.firstName),
                    _ProfileRow(
                        icon: Icons.text_fields_rounded,
                        label: 'Middle initial',
                        value: name.middleInitial.isEmpty
                            ? 'Not provided'
                            : '${name.middleInitial}.'),
                    _ProfileRow(
                        icon: Icons.alternate_email_rounded,
                        label: 'Username',
                        value: profile.username ?? 'Not assigned'),
                    _ProfileRow(
                        icon: Icons.email_outlined,
                        label: 'Email',
                        value: profile.email ?? 'Not provided'),
                    _ProfileRow(
                        icon: Icons.phone_outlined,
                        label: 'Phone',
                        value: profile.phone ?? 'Not provided',
                        divider: false),
                  ]))),
          const SizedBox(height: 14),
          Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: TriSafeColors.softGreen,
                  borderRadius: BorderRadius.circular(15)),
              child: const Row(children: [
                Icon(Icons.admin_panel_settings_outlined,
                    color: TriSafeColors.forest),
                SizedBox(width: 10),
                Expanded(
                    child: Text(
                        'Contact the LGU administrator if any account information needs correction.',
                        style: TextStyle(
                            fontSize: 10,
                            height: 1.45,
                            color: TriSafeColors.muted)))
              ])),
          const SizedBox(height: 22),
          OutlinedButton.icon(
              onPressed: onLogout,
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Sign out')),
        ]);
  }
}

class _StatusBadge extends StatelessWidget {
  final bool active;
  const _StatusBadge({required this.active});
  @override
  Widget build(BuildContext context) => Align(
      alignment: Alignment.centerLeft,
      child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
          decoration: BoxDecoration(
              color: (active ? TriSafeColors.lime : TriSafeColors.danger)
                  .withValues(alpha: .15),
              borderRadius: BorderRadius.circular(99)),
          child: Text(active ? 'ACTIVE PASSENGER' : 'INACTIVE ACCOUNT',
              style: TextStyle(
                  color: active ? TriSafeColors.lime : const Color(0xffff8d8d),
                  fontSize: 8,
                  letterSpacing: .8,
                  fontWeight: FontWeight.w900))));
}

class _AccountMetric extends StatelessWidget {
  final String value;
  final String label;
  const _AccountMetric({required this.value, required this.label});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(15),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value,
                style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: TriSafeColors.forest)),
            const SizedBox(height: 3),
            Text(label,
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted))
          ])));
}

class _ProfileRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool divider;
  const _ProfileRow(
      {required this.icon,
      required this.label,
      required this.value,
      this.divider = true});
  @override
  Widget build(BuildContext context) => Column(children: [
        Padding(
            padding: const EdgeInsets.symmetric(vertical: 13),
            child: Row(children: [
              Icon(icon, color: TriSafeColors.forest, size: 19),
              const SizedBox(width: 11),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(label,
                        style: const TextStyle(
                            fontSize: 9, color: TriSafeColors.muted)),
                    const SizedBox(height: 2),
                    Text(value,
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800))
                  ]))
            ])),
        if (divider) const Divider(height: 1)
      ]);
}

({String lastName, String firstName, String middleInitial}) _parseName(
    String fullName) {
  final clean = fullName.trim();
  if (clean.contains(',')) {
    final pieces = clean.split(',');
    final last = pieces.first.trim();
    final rest = pieces.skip(1).join(',').trim().split(RegExp(r'\s+'));
    final middle = rest.length > 1
        ? rest.last.replaceAll('.', '').substring(0, 1).toUpperCase()
        : '';
    final first = rest.length > 1
        ? rest.sublist(0, rest.length - 1).join(' ')
        : rest.join(' ');
    return (lastName: last, firstName: first, middleInitial: middle);
  }
  final words = clean.split(RegExp(r'\s+'));
  if (words.length == 1) {
    return (lastName: '', firstName: clean, middleInitial: '');
  }
  return (
    lastName: words.last,
    firstName: words.first,
    middleInitial: words.length > 2
        ? words[words.length - 2]
            .replaceAll('.', '')
            .substring(0, 1)
            .toUpperCase()
        : ''
  );
}

String _initials(String value) {
  final words = value
      .replaceAll(',', ' ')
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList();
  if (words.isEmpty) return 'P';
  return words.take(2).map((word) => word[0].toUpperCase()).join();
}
