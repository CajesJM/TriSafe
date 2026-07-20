import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/ride_models.dart';
import '../services/trisafe_api.dart';

Future<void> showEmergencyContacts(BuildContext context, TriSafeApi api,
    {Ride? activeRide, Future<void> Function()? onShareRide}) async {
  final contacts = await api.emergencyContacts();
  if (!context.mounted) {
    return;
  }
  await showModalBottomSheet<void>(
    context: context,
    builder: (sheetContext) => SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        shrinkWrap: true,
        children: [
          const Text('Emergency contacts',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(
            'Call the appropriate hotline for immediate help. If you are on a ride, share your ride details with a trusted contact too.',
            style: TextStyle(color: Colors.grey.shade700),
          ),
          const SizedBox(height: 12),
          ...contacts.map((item) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.phone_in_talk),
              title: Text(item['name']),
              subtitle: Text(item['description'] ?? ''),
              trailing: TextButton.icon(
                  onPressed: () => _callContact(
                      sheetContext, item['phone'].toString()),
                  icon: const Icon(Icons.call_outlined),
                  label: const Text('Call')))),
          if (activeRide != null && onShareRide != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () async {
                  Navigator.of(sheetContext).pop();
                  await onShareRide();
                },
                icon: const Icon(Icons.share_outlined),
                label: const Text('Share current ride details'),
              ),
            ),
          ],
        ],
      ),
    ),
  );
}

Future<void> _callContact(BuildContext context, String phone) async {
  final launched = await launchUrl(
    Uri(scheme: 'tel', path: phone),
    mode: LaunchMode.externalApplication,
  );
  if (!launched && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('This device could not open the phone dialer.')),
    );
  }
}
