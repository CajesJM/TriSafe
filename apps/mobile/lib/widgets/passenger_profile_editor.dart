import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/auth_models.dart';
import '../services/trisafe_api.dart';

Future<PassengerProfile?> showPassengerProfileEditor(
  BuildContext context,
  TriSafeApi api,
  PassengerProfile profile,
) async {
  final email = TextEditingController(text: profile.email ?? '');
  final phone = TextEditingController(text: profile.phone ?? '+63 ');
  XFile? selectedPhoto;
  var saving = false;

  final result = await showDialog<PassengerProfile>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (dialogContext, setDialogState) {
        Future<void> selectPhoto() async {
          final file = await ImagePicker().pickImage(
            source: ImageSource.gallery,
            imageQuality: 82,
            maxWidth: 1200,
          );
          if (file == null) return;
          if (await file.length() > 2 * 1024 * 1024) {
            if (dialogContext.mounted) {
              ScaffoldMessenger.of(dialogContext).showSnackBar(
                const SnackBar(
                    content: Text('Profile photo must be 2 MB or smaller.')),
              );
            }
            return;
          }
          setDialogState(() => selectedPhoto = file);
        }

        Future<void> save() async {
          final normalizedPhone = _normalizePhilippineMobile(phone.text);
          final enteredEmail = email.text.trim();
          if (enteredEmail.isNotEmpty &&
              !RegExp(r'^[^\s@]+@gmail\.com$', caseSensitive: false)
                  .hasMatch(enteredEmail)) {
            ScaffoldMessenger.of(dialogContext).showSnackBar(
              const SnackBar(
                  content: Text('Enter a valid @gmail.com email address.')),
            );
            return;
          }
          if (phone.text.trim().isNotEmpty && normalizedPhone == null) {
            ScaffoldMessenger.of(dialogContext).showSnackBar(
              const SnackBar(content: Text('Enter a valid +63 mobile number.')),
            );
            return;
          }

          setDialogState(() => saving = true);
          try {
            final avatarData = selectedPhoto == null
                ? null
                : _toDataImage(
                    selectedPhoto!.name,
                    await selectedPhoto!.readAsBytes(),
                  );
            final updated = await api.updatePassengerProfile(
              email: enteredEmail.isEmpty ? null : enteredEmail,
              phone: phone.text.trim().isEmpty ? null : normalizedPhone,
              avatarData: avatarData,
              updateAvatar: selectedPhoto != null,
            );
            if (dialogContext.mounted) Navigator.pop(dialogContext, updated);
          } catch (error) {
            if (dialogContext.mounted) {
              ScaffoldMessenger.of(dialogContext)
                  .showSnackBar(SnackBar(content: Text('$error')));
            }
            setDialogState(() => saving = false);
          }
        }

        return AlertDialog(
          title: const Text('Edit contact information'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 390,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    decoration:
                        const InputDecoration(labelText: 'Gmail address'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone number',
                      hintText: '+63 9XXXXXXXXX',
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: saving ? null : selectPhoto,
                    icon: const Icon(Icons.photo_camera_back_outlined),
                    label: Text(selectedPhoto?.name ?? 'Change profile photo'),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Your name and username are LGU-managed. You may update contact details and your profile photo.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 9, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: saving ? null : save,
              child: Text(saving ? 'Saving…' : 'Save changes'),
            ),
          ],
        );
      },
    ),
  );

  email.dispose();
  phone.dispose();
  return result;
}

String? _normalizePhilippineMobile(String value) {
  final digits = value.replaceAll(RegExp(r'[^0-9]'), '');
  final local = digits.startsWith('63') ? digits.substring(2) : digits;
  return RegExp(r'^9\d{9}$').hasMatch(local) ? '+63$local' : null;
}

String _toDataImage(String name, List<int> bytes) {
  final mimeType = name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  return 'data:image/$mimeType;base64,${base64Encode(bytes)}';
}
