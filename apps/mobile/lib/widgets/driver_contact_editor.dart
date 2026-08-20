import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/driver_models.dart';
import '../services/trisafe_api.dart';
import '../theme/trisafe_theme.dart';

Future<bool> showDriverContactEditor(
    BuildContext context, TriSafeApi api, DriverProfile profile) async {
  final storedDigits = profile.phone.replaceAll(RegExp(r'\D'), '');
  final localPhone =
      storedDigits.startsWith('63') ? storedDigits.substring(2) : storedDigits;
  final phoneController = TextEditingController(text: localPhone);
  final formKey = GlobalKey<FormState>();
  String? serverError;
  var saving = false;

  final saved = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            icon: const Icon(Icons.contact_phone_outlined,
                color: TriSafeColors.forest, size: 32),
            title: const Text('Edit contact information'),
            content: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: formKey,
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextFormField(
                    controller: phoneController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(10),
                    ],
                    decoration: const InputDecoration(
                        labelText: 'Mobile number',
                        prefixText: '+63 ',
                        prefixIcon: Icon(Icons.phone_outlined),
                        helperText: 'Enter the 10 digits after +63'),
                    validator: (value) {
                      final digits = value ?? '';
                      if (!RegExp(r'^9\d{9}$').hasMatch(digits)) {
                        return 'Enter a 10-digit Philippine mobile number starting with 9.';
                      }
                      return null;
                    },
                  ),
                  if (serverError != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(11),
                      decoration: BoxDecoration(
                          color: const Color(0xffffeeee),
                          borderRadius: BorderRadius.circular(10)),
                      child: Text(serverError!,
                          style: const TextStyle(
                              color: TriSafeColors.danger,
                              fontSize: 10,
                              height: 1.4)),
                    ),
                  ],
                ]),
              ),
            ),
            actions: [
              TextButton(
                  onPressed:
                      saving ? null : () => Navigator.pop(dialogContext, false),
                  child: const Text('Cancel')),
              FilledButton(
                onPressed: saving
                    ? null
                    : () async {
                        if (!formKey.currentState!.validate()) return;
                        setDialogState(() {
                          saving = true;
                          serverError = null;
                        });
                        try {
                          await api.updateDriverContact(
                              phone: '+63${phoneController.text}');
                          if (dialogContext.mounted) {
                            Navigator.pop(dialogContext, true);
                          }
                        } catch (error) {
                          setDialogState(() {
                            saving = false;
                            serverError = _friendlyContactError(error);
                          });
                        }
                      },
                child: saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('Save changes'),
              ),
            ],
          ),
        ),
      ) ??
      false;

  phoneController.dispose();
  return saved;
}

String _friendlyContactError(Object error) {
  final message = error.toString();
  if (message.contains('already used')) {
    return 'That contact number is already used by another account.';
  }
  if (message.contains('400')) {
    return 'Check the phone number, then try again.';
  }
  return 'Contact information could not be updated. Please try again.';
}
