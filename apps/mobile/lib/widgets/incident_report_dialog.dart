import 'package:flutter/material.dart';
import '../services/trisafe_api.dart';

Future<void> showIncidentReport(BuildContext context, TriSafeApi api,
    {String? rideId}) async {
  final controller = TextEditingController();
  final submitted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
              title: const Text('Describe what happened'),
              content: TextField(
                  controller: controller,
                  minLines: 4,
                  maxLines: 7,
                  decoration: const InputDecoration(
                      hintText:
                          'Include what happened, where, and when if you can.')),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: const Text('Cancel')),
                FilledButton(
                    onPressed: () => Navigator.pop(dialogContext, true),
                    child: const Text('Draft report'))
              ]));
  if (submitted != true ||
      controller.text.trim().length < 10 ||
      !context.mounted) {
    controller.dispose();
    return;
  }
  try {
    final draft = await api.draftIncident(controller.text, rideId: rideId);
    if (!context.mounted) {
      return;
    }
    final confirm = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
                title: Text('Suggested ${draft['category']} report'),
                content: SingleChildScrollView(
                    child: Text(
                        '${draft['aiDraft']}\n\nMissing: ${(draft['missingInformation'] as List).join(', ')}')),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(dialogContext),
                      child: const Text('Keep as draft')),
                  FilledButton(
                      onPressed: () => Navigator.pop(dialogContext, true),
                      child: const Text('Submit to LGU'))
                ]));
    if (confirm == true) {
      await api.submitIncident(draft['id']);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Incident submitted to the LGU for review.')),
        );
      }
    }
  } catch (exception) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Incident report could not be submitted: $exception')),
      );
    }
  } finally {
    controller.dispose();
  }
}
