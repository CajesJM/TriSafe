import 'package:flutter/material.dart';
import '../models/driver_models.dart';
import '../services/trisafe_api.dart';

Future<void> showDriverContactEditor(BuildContext context, TriSafeApi api,
    DriverProfile profile, Future<void> Function() onSaved) async {
  final emailController = TextEditingController(text: profile.email);
  final phoneController = TextEditingController(text: profile.phone);
  String? error;
  var saving = false;

  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setDialogState) => AlertDialog(
        title: const Text('Update contact information'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email address')),
          const SizedBox(height: 12),
          TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone number')),
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(error!, style: TextStyle(color: Colors.red.shade700))
          ]
        ]),
        actions: [
          TextButton(
              onPressed: saving ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      setDialogState(() {
                        saving = true;
                        error = null;
                      });
                      try {
                        await api.updateDriverContact(
                            phone: phoneController.text.trim(),
                            email: emailController.text.trim());
                        await onSaved();
                        if (dialogContext.mounted) {
                          Navigator.pop(dialogContext);
                        }
                      } catch (exception) {
                        setDialogState(() {
                          saving = false;
                          error = exception.toString();
                        });
                      }
                    },
              child: Text(saving ? 'Saving…' : 'Save changes'))
        ],
      ),
    ),
  );
  emailController.dispose();
  phoneController.dispose();
}
