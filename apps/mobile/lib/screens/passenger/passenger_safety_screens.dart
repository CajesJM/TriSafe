import 'package:flutter/material.dart';
import '../../models/passenger_safety_models.dart';
import '../../services/trisafe_api.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger_page_header.dart';

class PassengerReportHistoryScreen extends StatelessWidget {
  final TriSafeApi api;
  const PassengerReportHistoryScreen({super.key, required this.api});
  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: TriSafeColors.offWhite,
        appBar: AppBar(title: const Text('Report history')),
        body: FutureBuilder<List<PassengerIncident>>(
          future: api.incidentHistory(),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return const Center(child: Text('Reports could not be loaded.'));
            }
            final reports = snapshot.data ?? [];
            return ListView(
                padding: const EdgeInsets.fromLTRB(18, 20, 18, 28),
                children: [
                  const PassengerPageHeader(
                      eyebrow: 'SAFETY REPORTS',
                      title: 'Report history',
                      description:
                          'Track only the incident reports you submitted to the LGU.'),
                  const SizedBox(height: 18),
                  if (reports.isEmpty)
                    const _Empty(
                        icon: Icons.assignment_outlined,
                        title: 'No submitted reports',
                        message:
                            'Your draft and submitted transport incident reports will appear here.')
                  else
                    ...reports.map((report) => Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            onTap: () => _showReport(context, report),
                            leading: _StatusIcon(status: report.status),
                            title: Text(_label(report.category),
                                style: const TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.w900)),
                            subtitle: Text(
                                '${_label(report.status)} · ${_date(report.createdAt)}${report.evidenceName == null ? '' : ' · Evidence attached'}',
                                style: const TextStyle(fontSize: 9)),
                            trailing: const Icon(Icons.chevron_right_rounded),
                          ),
                        )),
                ]);
          },
        ),
      );
}

class PassengerTrustedContactsScreen extends StatefulWidget {
  final TriSafeApi api;
  const PassengerTrustedContactsScreen({super.key, required this.api});
  @override
  State<PassengerTrustedContactsScreen> createState() =>
      _PassengerTrustedContactsScreenState();
}

class _PassengerTrustedContactsScreenState
    extends State<PassengerTrustedContactsScreen> {
  late Future<List<TrustedContact>> _future;
  @override
  void initState() {
    super.initState();
    _future = widget.api.trustedContacts();
  }

  void _refresh() => setState(() => _future = widget.api.trustedContacts());
  Future<void> _edit(TrustedContact? contact) async {
    final name = TextEditingController(text: contact?.fullName);
    final relation = TextEditingController(text: contact?.relationship);
    final phone = TextEditingController(text: contact?.phone ?? '+63 ');
    final saved = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
              title: Text(contact == null
                  ? 'Add trusted contact'
                  : 'Edit trusted contact'),
              content: SingleChildScrollView(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Full name')),
                const SizedBox(height: 10),
                TextField(
                    controller: relation,
                    decoration:
                        const InputDecoration(labelText: 'Relationship')),
                const SizedBox(height: 10),
                TextField(
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                        labelText: 'Phone number', hintText: '+63 9XXXXXXXXX')),
              ])),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: const Text('Cancel')),
                FilledButton(
                    onPressed: () async {
                      final normalized =
                          '+63${phone.text.replaceAll(RegExp(r'[^0-9]'), '').replaceFirst(RegExp(r'^63'), '')}';
                      if (name.text.trim().length < 2 ||
                          relation.text.trim().length < 2 ||
                          !RegExp(r'^\+63\d{10}$').hasMatch(normalized)) {
                        ScaffoldMessenger.of(dialogContext).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    'Enter a name, relationship, and valid +63 mobile number.')));
                        return;
                      }
                      try {
                        await widget.api.saveTrustedContact(
                            id: contact?.id,
                            fullName: name.text.trim(),
                            relationship: relation.text.trim(),
                            phone: normalized,
                            active: contact?.active ?? true);
                        if (dialogContext.mounted) {
                          Navigator.pop(dialogContext, true);
                        }
                      } catch (error) {
                        if (dialogContext.mounted) {
                          ScaffoldMessenger.of(dialogContext)
                              .showSnackBar(SnackBar(content: Text('$error')));
                        }
                      }
                    },
                    child: const Text('Save contact')),
              ],
            ));
    name.dispose();
    relation.dispose();
    phone.dispose();
    if (saved == true) _refresh();
  }

  Future<void> _delete(TrustedContact contact) async {
    final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
                title: const Text('Remove trusted contact?'),
                content: Text(
                    '${contact.fullName} will no longer appear in your safety contacts.'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(dialogContext, false),
                      child: const Text('Cancel')),
                  FilledButton(
                      onPressed: () => Navigator.pop(dialogContext, true),
                      child: const Text('Remove'))
                ]));
    if (confirmed == true) {
      await widget.api.deleteTrustedContact(contact.id);
      _refresh();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: TriSafeColors.offWhite,
        appBar: AppBar(title: const Text('Trusted contacts')),
        floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _edit(null),
            icon: const Icon(Icons.person_add_alt_1_rounded),
            label: const Text('Add contact')),
        body: FutureBuilder<List<TrustedContact>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              final contacts = snapshot.data ?? [];
              return ListView(
                  padding: const EdgeInsets.fromLTRB(18, 20, 18, 100),
                  children: [
                    const PassengerPageHeader(
                        eyebrow: 'SAFETY NETWORK',
                        title: 'Trusted contacts',
                        description:
                            'Save up to five people you can contact when sharing an active ride or using SOS.'),
                    const SizedBox(height: 18),
                    if (contacts.isEmpty)
                      const _Empty(
                          icon: Icons.group_outlined,
                          title: 'No trusted contacts',
                          message:
                              'Add people who can receive your ride details during an emergency.')
                    else
                      ...contacts.map((contact) => Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            leading: CircleAvatar(
                                backgroundColor: TriSafeColors.softGreen,
                                child: Text(
                                    contact.fullName
                                        .substring(0, 1)
                                        .toUpperCase(),
                                    style: const TextStyle(
                                        color: TriSafeColors.forest,
                                        fontWeight: FontWeight.w900))),
                            title: Text(contact.fullName,
                                style: const TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.w900)),
                            subtitle: Text(
                                '${contact.relationship} · ${contact.phone}',
                                style: const TextStyle(fontSize: 9)),
                            trailing: PopupMenuButton<String>(
                                onSelected: (value) => value == 'edit'
                                    ? _edit(contact)
                                    : _delete(contact),
                                itemBuilder: (_) => const [
                                      PopupMenuItem(
                                          value: 'edit', child: Text('Edit')),
                                      PopupMenuItem(
                                          value: 'delete',
                                          child: Text('Remove'))
                                    ]),
                          ))),
                  ]);
            }),
      );
}

void _showReport(BuildContext context, PassengerIncident item) =>
    showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        isScrollControlled: true,
        builder: (_) => SafeArea(
            child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(22, 5, 22, 28),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_label(item.category),
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 5),
                      Text('${_label(item.status)} · ${_date(item.createdAt)}',
                          style: const TextStyle(
                              fontSize: 10, color: TriSafeColors.muted)),
                      const Divider(height: 28),
                      Text(item.finalDescription ?? item.rawDescription,
                          style: const TextStyle(fontSize: 12, height: 1.6)),
                      if (item.evidenceName != null)
                        Padding(
                            padding: const EdgeInsets.only(top: 14),
                            child: Text(
                                'Evidence attached: ${item.evidenceName}',
                                style: const TextStyle(
                                    fontSize: 10,
                                    color: TriSafeColors.forest))),
                      if (item.reviewerNotes != null)
                        Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: Text('LGU update: ${item.reviewerNotes}',
                                style: const TextStyle(
                                    fontSize: 11, fontWeight: FontWeight.w700)))
                    ]))));

class _Empty extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  const _Empty(
      {required this.icon, required this.title, required this.message});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(children: [
            Icon(icon, size: 38, color: TriSafeColors.forest),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 5),
            Text(message,
                textAlign: TextAlign.center,
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted))
          ])));
}

class _StatusIcon extends StatelessWidget {
  final String status;
  const _StatusIcon({required this.status});
  @override
  Widget build(BuildContext context) => CircleAvatar(
      backgroundColor: status == 'RESOLVED'
          ? TriSafeColors.softGreen
          : const Color(0xfffff1cd),
      child: Icon(
          status == 'RESOLVED'
              ? Icons.check_circle_outline_rounded
              : Icons.pending_actions_outlined,
          color: status == 'RESOLVED'
              ? TriSafeColors.forest
              : const Color(0xff8a5a00)));
}

String _label(String value) => value
    .toLowerCase()
    .split('_')
    .map((part) =>
        part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
    .join(' ');
String _date(DateTime value) => '${value.month}/${value.day}/${value.year}';
