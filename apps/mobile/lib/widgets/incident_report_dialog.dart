import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/trisafe_api.dart';
import '../theme/trisafe_theme.dart';

Future<void> showIncidentReport(BuildContext context, TriSafeApi api,
    {String? rideId}) async {
  final description = TextEditingController();
  final categories = [
    'SAFETY',
    'OVERCHARGING',
    'HARASSMENT',
    'VEHICLE',
    'OTHER'
  ];
  var category = 'OTHER';
  XFile? evidence;
  final input = await showDialog<Map<String, dynamic>>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        icon: const Icon(Icons.report_problem_outlined,
            color: TriSafeColors.danger),
        title: const Text('Report an incident'),
        content: SizedBox(
          width: 390,
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              DropdownButtonFormField<String>(
                initialValue: category,
                decoration:
                    const InputDecoration(labelText: 'Incident category'),
                items: categories
                    .map((value) => DropdownMenuItem(
                        value: value, child: Text(_label(value))))
                    .toList(),
                onChanged: (value) =>
                    setLocal(() => category = value ?? 'OTHER'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: description,
                minLines: 4,
                maxLines: 7,
                maxLength: 4000,
                decoration: const InputDecoration(
                    labelText: 'What happened?',
                    hintText: 'Describe what happened, where, and when.'),
              ),
              OutlinedButton.icon(
                onPressed: () async {
                  final file = await ImagePicker().pickImage(
                      source: ImageSource.gallery,
                      imageQuality: 82,
                      maxWidth: 1600);
                  if (file == null) return;
                  if (await file.length() > 2 * 1024 * 1024) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content:
                              Text('Evidence image must be 2 MB or smaller.')));
                    }
                    return;
                  }
                  setLocal(() => evidence = file);
                },
                icon: const Icon(Icons.attach_file_rounded),
                label: Text(evidence == null
                    ? 'Add photo evidence (optional)'
                    : 'Evidence: ${evidence!.name}'),
              ),
              const SizedBox(height: 8),
              const Text(
                'AI only helps organize your wording. The LGU makes all decisions.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 9, color: TriSafeColors.muted),
              ),
            ]),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (description.text.trim().length < 10) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Please enter at least 10 characters.')));
                return;
              }
              String? data;
              if (evidence != null) {
                final type = evidence!.name.toLowerCase().endsWith('.png')
                    ? 'png'
                    : 'jpeg';
                data =
                    'data:image/$type;base64,${base64Encode(await evidence!.readAsBytes())}';
              }
              if (dialogContext.mounted) {
                Navigator.pop(dialogContext, {
                  'description': description.text.trim(),
                  'category': category,
                  'evidenceData': data,
                  'evidenceName': evidence?.name,
                });
              }
            },
            child: const Text('Create AI draft'),
          ),
        ],
      ),
    ),
  );
  description.dispose();
  if (input == null || !context.mounted) return;
  try {
    final draft = await api.draftIncident(input['description'] as String,
        rideId: rideId,
        category: input['category'] as String,
        evidenceData: input['evidenceData'] as String?,
        evidenceName: input['evidenceName'] as String?);
    if (!context.mounted) return;
    final finalText = TextEditingController(
        text: draft['aiDraft'] as String? ?? input['description'] as String);
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Review ${_label(draft['category'].toString())} report'),
        content: SizedBox(
          width: 390,
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                  controller: finalText,
                  minLines: 6,
                  maxLines: 10,
                  maxLength: 4000,
                  decoration: const InputDecoration(
                      labelText: 'Final report description')),
              const SizedBox(height: 8),
              Text(
                'Suggested missing details: ${((draft['missingInformation'] as List?) ?? []).join(', ')}',
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted),
              ),
            ]),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Keep draft')),
          FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Submit to LGU')),
        ],
      ),
    );
    if (submit == true) {
      await api.submitIncident(draft['id'] as String,
          finalDescription: finalText.text.trim(),
          category: draft['category'] as String?);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Incident submitted to the LGU for review.'),
            backgroundColor: TriSafeColors.forest));
      }
    }
    finalText.dispose();
  } catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Incident report could not be saved: $error')));
    }
  }
}

String _label(String value) => value
    .toLowerCase()
    .split('_')
    .map((part) =>
        part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
    .join(' ');
