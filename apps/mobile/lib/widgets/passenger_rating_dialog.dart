import 'package:flutter/material.dart';
import '../models/ride_models.dart';
import '../services/trisafe_api.dart';

Future<bool> showPassengerRatingDialog(
  BuildContext context,
  TriSafeApi api,
  Ride ride,
) async {
  var score = 5;
  final comment = TextEditingController();
  final submitted = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        icon:
            const Icon(Icons.star_rounded, color: Color(0xffa87300), size: 34),
        title: const Text('Rate your ride'),
        content: SizedBox(
          width: 370,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('How was your ride with ${ride.driverName ?? 'this driver'}?',
                textAlign: TextAlign.center),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                5,
                (index) => IconButton(
                  onPressed: () => setLocal(() => score = index + 1),
                  icon: Icon(
                    index < score
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    color: const Color(0xffb17800),
                    size: 32,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: comment,
              maxLength: 1000,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Optional feedback'),
            ),
          ]),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Not now')),
          FilledButton(
            onPressed: () async {
              try {
                await api.createRating(
                    rideId: ride.id, score: score, comment: comment.text);
                if (dialogContext.mounted) Navigator.pop(dialogContext, true);
              } catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(dialogContext)
                      .showSnackBar(SnackBar(content: Text('$error')));
                }
              }
            },
            child: const Text('Submit rating'),
          ),
        ],
      ),
    ),
  );
  comment.dispose();
  return submitted == true;
}
