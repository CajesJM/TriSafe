import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/auth_models.dart';
import '../services/trisafe_api.dart';

/// Opens the platform photo library immediately, then persists the selected
/// image. The dashboard avatar uses this path so a passenger does not have to
/// enter the full contact-information dialog just to change their photo.
Future<PassengerProfile?> pickAndSavePassengerProfilePhoto(
    BuildContext context, TriSafeApi api,
    {ImageSource source = ImageSource.gallery}) async {
  final file = await ImagePicker().pickImage(
    source: source,
    imageQuality: 82,
    maxWidth: 1200,
  );
  if (file == null) return null;

  if (await file.length() > 2 * 1024 * 1024) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile photo must be 2 MB or smaller.')),
      );
    }
    return null;
  }

  try {
    return await api.updatePassengerProfile(
      avatarData: _toDataImage(file.name, await file.readAsBytes()),
      updateAvatar: true,
    );
  } catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not update profile photo: $error')),
      );
    }
    return null;
  }
}

Future<PassengerProfile?> showPassengerProfilePhotoActions(
  BuildContext context,
  TriSafeApi api,
  PassengerProfile profile,
) async {
  final action = await showModalBottomSheet<String>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        decoration: const BoxDecoration(
          color: Color(0xfffbfcf8),
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                  color: const Color(0xffd8e6d3),
                  borderRadius: BorderRadius.circular(99))),
          const SizedBox(height: 18),
          const Row(children: [
            Icon(Icons.account_circle_outlined,
                color: Color(0xff277422), size: 25),
            SizedBox(width: 10),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('Profile photo',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                  SizedBox(height: 2),
                  Text('Choose how you would like to update your photo.',
                      style: TextStyle(fontSize: 10, color: Colors.grey)),
                ])),
          ]),
          const SizedBox(height: 16),
          _PhotoActionTile(
              icon: Icons.photo_camera_rounded,
              title: 'Take a photo',
              subtitle: 'Use your device camera',
              onTap: () => Navigator.pop(sheetContext, 'camera')),
          const SizedBox(height: 8),
          _PhotoActionTile(
              icon: Icons.photo_library_outlined,
              title: 'Choose from gallery',
              subtitle: 'Select an existing photo',
              onTap: () => Navigator.pop(sheetContext, 'gallery')),
          if (profile.avatarData != null) ...[
            const SizedBox(height: 8),
            _PhotoActionTile(
                icon: Icons.delete_outline_rounded,
                title: 'Remove current photo',
                subtitle: 'Delete the photo from your TriSafe profile',
                danger: true,
                onTap: () => Navigator.pop(sheetContext, 'remove')),
          ],
        ]),
      ),
    ),
  );
  if (action == null || !context.mounted) return null;
  if (action == 'remove') {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove profile photo?'),
        content: const Text(
            'Your current photo will be removed from the TriSafe database.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Keep photo')),
          FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Remove photo')),
        ],
      ),
    );
    if (confirmed != true) {
      return null;
    }
    try {
      return await api.updatePassengerProfile(
          avatarData: null, updateAvatar: true);
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not remove profile photo: $error')));
      }
      return null;
    }
  }
  return pickAndSavePassengerProfilePhoto(context, api,
      source: action == 'camera' ? ImageSource.camera : ImageSource.gallery);
}

class _PhotoActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool danger;
  const _PhotoActionTile(
      {required this.icon,
      required this.title,
      required this.subtitle,
      required this.onTap,
      this.danger = false});
  @override
  Widget build(BuildContext context) => Material(
      color: danger ? const Color(0xfffff8f8) : Colors.white,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(15),
          child: Container(
              constraints: const BoxConstraints(minHeight: 62),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
              decoration: BoxDecoration(
                  border: Border.all(
                      color: danger
                          ? const Color(0xffe4b5b8)
                          : const Color(0xffd8e6d3)),
                  borderRadius: BorderRadius.circular(15)),
              child: Row(children: [
                Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                        color: danger
                            ? const Color(0xffffe8e9)
                            : const Color(0xffeef8ea),
                        borderRadius: BorderRadius.circular(12)),
                    child: Icon(icon,
                        color: danger
                            ? const Color(0xffa92d34)
                            : const Color(0xff277422))),
                const SizedBox(width: 11),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(title,
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: danger
                                  ? const Color(0xffa92d34)
                                  : Colors.black)),
                      const SizedBox(height: 2),
                      Text(subtitle,
                          style:
                              const TextStyle(fontSize: 10, color: Colors.grey))
                    ])),
                Icon(Icons.chevron_right_rounded,
                    color: danger
                        ? const Color(0xffa92d34)
                        : const Color(0xff277422))
              ]))));
}

Future<PassengerProfile?> showPassengerProfileEditor(
  BuildContext context,
  TriSafeApi api,
  PassengerProfile profile,
) async {
  final fullName = TextEditingController(text: profile.fullName);
  final username = TextEditingController(text: profile.username ?? '');
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
          final enteredFullName = fullName.text.trim();
          final enteredUsername = username.text.trim();
          if (enteredFullName.length < 2) {
            ScaffoldMessenger.of(dialogContext).showSnackBar(
              const SnackBar(content: Text('Enter your full name.')),
            );
            return;
          }
          if (enteredUsername.length < 3 ||
              !RegExp(r'^[a-zA-Z0-9._-]+$').hasMatch(enteredUsername)) {
            ScaffoldMessenger.of(dialogContext).showSnackBar(
              const SnackBar(
                  content: Text(
                      'Username must be at least 3 characters and may use letters, numbers, dots, underscores, or hyphens.')),
            );
            return;
          }
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
              fullName: enteredFullName,
              username: enteredUsername,
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
                    controller: fullName,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Full name'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: username,
                    autocorrect: false,
                    decoration: const InputDecoration(labelText: 'Username'),
                  ),
                  const SizedBox(height: 12),
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
                    'Keep your account information accurate. Your profile photo can also be changed or removed from the profile screen.',
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
  fullName.dispose();
  username.dispose();
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
