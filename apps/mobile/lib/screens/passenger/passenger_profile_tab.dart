import 'package:flutter/material.dart';

import '../../models/auth_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_avatar.dart';
import '../../widgets/passenger_page_header.dart';

class PassengerProfileTab extends StatelessWidget {
  final PassengerProfile profile;
  final int rideCount;
  final VoidCallback onLogout;
  final VoidCallback onOpenRides;
  final VoidCallback onOpenReports;
  final VoidCallback onOpenTrustedContacts;
  final VoidCallback onOpenSettings;
  final VoidCallback onEditProfile;
  final VoidCallback onChangePhoto;

  const PassengerProfileTab({
    super.key,
    required this.profile,
    required this.rideCount,
    required this.onLogout,
    required this.onOpenRides,
    required this.onOpenReports,
    required this.onOpenTrustedContacts,
    required this.onOpenSettings,
    required this.onEditProfile,
    required this.onChangePhoto,
  });

  @override
  Widget build(BuildContext context) {
    final name = _parseName(profile.fullName);
    final active = profile.status == 'ACTIVE';
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xfff4faf1), Color(0xfff8faf7), Color(0xffeef7eb)],
        ),
      ),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
        children: [
          const PassengerPageHeader(
            eyebrow: 'MY ACCOUNT',
            title: 'Passenger profile',
            description:
                'Manage your identity, ride records, and safety settings.',
          ),
          const SizedBox(height: 18),
          _ProfileHero(
              profile: profile,
              rideCount: rideCount,
              active: active,
              onChangePhoto: onChangePhoto),
          const SizedBox(height: 22),
          const _SectionTitle(
              title: 'Contact information',
              subtitle: 'Your verified account details'),
          const SizedBox(height: 10),
          _InformationPanel(name: name, profile: profile),
          const SizedBox(height: 12),
          SizedBox(
              height: 50,
              child: FilledButton.icon(
                  onPressed: onEditProfile,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Edit contact information'))),
          const SizedBox(height: 22),
          const _SectionTitle(
              title: 'Safety & records',
              subtitle: 'Quick access to your TriSafe tools'),
          const SizedBox(height: 10),
          _QuickAccessPanel(
            rideCount: rideCount,
            onOpenRides: onOpenRides,
            onOpenReports: onOpenReports,
            onOpenTrustedContacts: onOpenTrustedContacts,
            onOpenSettings: onOpenSettings,
          ),
          const SizedBox(height: 14),
          const _AccountNotice(),
          const SizedBox(height: 22),
          OutlinedButton.icon(
            onPressed: onLogout,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out of TriSafe'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              foregroundColor: const Color(0xffa92d34),
              side: const BorderSide(color: Color(0xffe4b5b8)),
              backgroundColor: const Color(0xfffff8f8),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileHero extends StatelessWidget {
  final PassengerProfile profile;
  final int rideCount;
  final bool active;
  final VoidCallback onChangePhoto;
  const _ProfileHero(
      {required this.profile,
      required this.rideCount,
      required this.active,
      required this.onChangePhoto});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xff101610), Color(0xff1d2a1e)]),
          border: Border.all(color: const Color(0xff354235)),
          borderRadius: BorderRadius.circular(22),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Semantics(
              button: true,
              label: 'Change profile photo',
              child: InkWell(
                onTap: onChangePhoto,
                customBorder: const CircleBorder(),
                child: Stack(clipBehavior: Clip.none, children: [
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: const Color(0xff93df65), width: 2)),
                    child: DriverAvatar(
                        fullName: profile.fullName,
                        avatarData: profile.avatarData,
                        radius: 31),
                  ),
                  Positioned(
                    right: -2,
                    bottom: -2,
                    child: Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                          color: TriSafeColors.lime,
                          shape: BoxShape.circle,
                          border:
                              Border.all(color: TriSafeColors.black, width: 2)),
                      child: const Icon(Icons.photo_camera_rounded,
                          size: 14, color: TriSafeColors.black),
                    ),
                  ),
                ]),
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(profile.fullName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          height: 1.15,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 4),
                  Text('@${profile.username ?? 'username-not-set'}',
                      style: const TextStyle(
                          color: Color(0xffbdc5bd), fontSize: 11)),
                  const SizedBox(height: 8),
                  _StatusBadge(active: active),
                ])),
          ]),
          const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Divider(height: 1, color: Color(0xff394139))),
          Row(children: [
            _HeroMetric(
                icon: Icons.route_outlined,
                value: '$rideCount',
                label: 'Ride records'),
            const _HeroDivider(),
            _HeroMetric(
                icon: Icons.verified_user_outlined,
                value: active ? 'Verified' : 'Restricted',
                label: 'Account access'),
          ]),
        ]),
      );
}

class _HeroMetric extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  const _HeroMetric(
      {required this.icon, required this.value, required this.label});
  @override
  Widget build(BuildContext context) => Expanded(
          child: Row(children: [
        Icon(icon, color: const Color(0xff93df65), size: 18),
        const SizedBox(width: 7),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w900)),
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Color(0xffbdc5bd), fontSize: 8.5))
        ]))
      ]));
}

class _HeroDivider extends StatelessWidget {
  const _HeroDivider();
  @override
  Widget build(BuildContext context) => Container(
      width: 1,
      height: 34,
      margin: const EdgeInsets.symmetric(horizontal: 10),
      color: const Color(0xff394139));
}

class _StatusBadge extends StatelessWidget {
  final bool active;
  const _StatusBadge({required this.active});
  @override
  Widget build(BuildContext context) {
    final color = active ? const Color(0xff93df65) : const Color(0xffff8d8d);
    return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
            color: color.withValues(alpha: .13),
            borderRadius: BorderRadius.circular(99)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(active ? Icons.check_circle_rounded : Icons.info_outline_rounded,
              color: color, size: 12),
          const SizedBox(width: 4),
          Text(active ? 'ACTIVE PASSENGER' : 'ACCOUNT RESTRICTED',
              style: TextStyle(
                  color: color,
                  fontSize: 8,
                  letterSpacing: .7,
                  fontWeight: FontWeight.w900))
        ]));
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String subtitle;
  const _SectionTitle({required this.title, required this.subtitle});
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        const SizedBox(height: 2),
        Text(subtitle,
            style: const TextStyle(fontSize: 10, color: TriSafeColors.muted))
      ]);
}

class _InformationPanel extends StatelessWidget {
  final ({String lastName, String firstName, String middleInitial}) name;
  final PassengerProfile profile;
  const _InformationPanel({required this.name, required this.profile});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: const Color(0xfffbfcf8),
            border: Border.all(color: const Color(0xffd8e6d3)),
            borderRadius: BorderRadius.circular(19)),
        child: Column(children: [
          _InfoRow(
              icon: Icons.badge_outlined,
              label: 'Last name',
              value: name.lastName.isEmpty ? 'Not provided' : name.lastName),
          _InfoRow(
              icon: Icons.person_outline_rounded,
              label: 'First name',
              value: name.firstName),
          _InfoRow(
              icon: Icons.text_fields_rounded,
              label: 'Middle initial',
              value: name.middleInitial.isEmpty
                  ? 'Not provided'
                  : '${name.middleInitial}.'),
          _InfoRow(
              icon: Icons.alternate_email_rounded,
              label: 'Username',
              value: profile.username ?? 'Not assigned'),
          _InfoRow(
              icon: Icons.email_outlined,
              label: 'Email address',
              value: profile.email ?? 'Not provided'),
          _InfoRow(
              icon: Icons.phone_outlined,
              label: 'Mobile number',
              value: profile.phone ?? 'Not provided',
              divider: false),
        ]),
      );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool divider;
  const _InfoRow(
      {required this.icon,
      required this.label,
      required this.value,
      this.divider = true});
  @override
  Widget build(BuildContext context) => Column(children: [
        Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                  width: 34,
                  height: 34,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                      color: TriSafeColors.softGreen,
                      borderRadius: BorderRadius.circular(10)),
                  child: Icon(icon, size: 18, color: TriSafeColors.forest)),
              const SizedBox(width: 11),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(label.toUpperCase(),
                        style: const TextStyle(
                            fontSize: 8,
                            letterSpacing: .8,
                            color: TriSafeColors.muted,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(value,
                        style: const TextStyle(
                            fontSize: 12,
                            height: 1.3,
                            fontWeight: FontWeight.w800))
                  ]))
            ])),
        if (divider)
          const Padding(
              padding: EdgeInsets.only(left: 59), child: Divider(height: 1))
      ]);
}

class _QuickAccessPanel extends StatelessWidget {
  final int rideCount;
  final VoidCallback onOpenRides;
  final VoidCallback onOpenReports;
  final VoidCallback onOpenTrustedContacts;
  final VoidCallback onOpenSettings;
  const _QuickAccessPanel(
      {required this.rideCount,
      required this.onOpenRides,
      required this.onOpenReports,
      required this.onOpenTrustedContacts,
      required this.onOpenSettings});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: const Color(0xfffbfcf8),
            border: Border.all(color: const Color(0xffd8e6d3)),
            borderRadius: BorderRadius.circular(19)),
        child: Column(children: [
          _AccessRow(
              icon: Icons.route_outlined,
              title: 'Ride history',
              subtitle:
                  '$rideCount recorded ${rideCount == 1 ? 'ride' : 'rides'} and verified trip details',
              onTap: onOpenRides),
          _AccessRow(
              icon: Icons.assignment_outlined,
              title: 'Report history',
              subtitle: 'Review your incident report statuses',
              onTap: onOpenReports),
          _AccessRow(
              icon: Icons.groups_outlined,
              title: 'Trusted contacts',
              subtitle: 'Manage SafeShare and emergency contacts',
              onTap: onOpenTrustedContacts),
          _AccessRow(
              icon: Icons.settings_outlined,
              title: 'Account settings',
              subtitle: 'Password, policies, and app information',
              onTap: onOpenSettings,
              divider: false),
        ]),
      );
}

class _AccessRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool divider;
  const _AccessRow(
      {required this.icon,
      required this.title,
      required this.subtitle,
      required this.onTap,
      this.divider = true});
  @override
  Widget build(BuildContext context) => Column(children: [
        ListTile(
            onTap: onTap,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            minVerticalPadding: 10,
            leading: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                    color: TriSafeColors.softGreen,
                    borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: TriSafeColors.forest, size: 20)),
            title: Text(title,
                style:
                    const TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
            subtitle: Text(subtitle,
                style: const TextStyle(
                    fontSize: 10, height: 1.3, color: TriSafeColors.muted)),
            trailing: const Icon(Icons.chevron_right_rounded,
                color: TriSafeColors.forest)),
        if (divider)
          const Padding(
              padding: EdgeInsets.only(left: 64), child: Divider(height: 1))
      ]);
}

class _AccountNotice extends StatelessWidget {
  const _AccountNotice();
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: TriSafeColors.softGreen,
          border: Border.all(color: const Color(0xffd1e8c9)),
          borderRadius: BorderRadius.circular(16)),
      child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.admin_panel_settings_outlined,
            size: 20, color: TriSafeColors.forest),
        SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Account support',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
          SizedBox(height: 3),
          Text(
              'Contact your LGU administrator if any official account information needs correction.',
              style: TextStyle(
                  fontSize: 10, height: 1.4, color: TriSafeColors.muted))
        ]))
      ]));
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
