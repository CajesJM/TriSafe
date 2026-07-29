import 'package:flutter/material.dart';
import '../models/ride_models.dart';

class RideHistoryCard extends StatelessWidget {
  final Ride ride;

  const RideHistoryCard({super.key, required this.ride});

  @override
  Widget build(BuildContext context) {
    final isActive = ride.status == 'ACTIVE';
    final route = '${ride.fromLocationName ?? 'Unknown origin'} → '
        '${ride.toLocationName ?? 'Unknown destination'}';

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    route,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ),
                _StatusLabel(isActive: isActive),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              '${ride.driverName ?? 'Verified driver'} · ${ride.plateNumber ?? 'Vehicle details unavailable'}',
              style: TextStyle(color: Colors.grey.shade700),
            ),
            const SizedBox(height: 6),
            Text(
              _formatDate(ride.startedAt),
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
            const Divider(height: 24),
            if (ride.actualDistanceMeters > 0) ...[
              Row(
                children: [
                  const Expanded(
                    child: Text('Tracked distance',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  Text(
                    '${(ride.actualDistanceMeters / 1000).toStringAsFixed(2)} km',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                ],
              ),
              const SizedBox(height: 9),
            ],
            Row(
              children: [
                Expanded(
                  child: Text(ride.finalFare == null ? 'Estimated fare' : 'Final fare',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
                Text(
                  'PHP ${(ride.finalFare ?? ride.estimatedFare).toStringAsFixed(2)}',
                  style: const TextStyle(
                      color: Color(0xff185449),
                      fontSize: 17,
                      fontWeight: FontWeight.w900),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) {
      return 'Date unavailable';
    }

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    final hour =
        date.hour == 0 ? 12 : (date.hour > 12 ? date.hour - 12 : date.hour);
    final minute = date.minute.toString().padLeft(2, '0');
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '${months[date.month - 1]} ${date.day}, ${date.year} · $hour:$minute $period';
  }
}

class _StatusLabel extends StatelessWidget {
  final bool isActive;

  const _StatusLabel({required this.isActive});

  @override
  Widget build(BuildContext context) {
    final color = isActive ? const Color(0xff185449) : Colors.blueGrey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .10),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        isActive ? 'Active' : 'Completed',
        style:
            TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800),
      ),
    );
  }
}
