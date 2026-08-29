import 'package:flutter/material.dart';

import '../../models/ride_models.dart';
import '../../theme/trisafe_theme.dart';

class PassengerRecentRides extends StatelessWidget {
  final List<Ride> rides;
  final VoidCallback onViewAll;

  const PassengerRecentRides({
    super.key,
    required this.rides,
    required this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    final completed =
        rides.where((ride) => ride.status == 'COMPLETED').take(3).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Recent rides',
                style: TextStyle(
                    color: TriSafeColors.black,
                    fontSize: 17,
                    fontWeight: FontWeight.w900)),
            SizedBox(height: 2),
            Text('Your latest verified journeys',
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ]),
        ),
        TextButton(onPressed: onViewAll, child: const Text('View all')),
      ]),
      const SizedBox(height: 10),
      if (completed.isEmpty)
        _EmptyRideHistory(onViewAll: onViewAll)
      else
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: TriSafeColors.line),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            children: [
              for (var index = 0; index < completed.length; index++) ...[
                _RecentRideRow(ride: completed[index]),
                if (index < completed.length - 1) const Divider(height: 1),
              ],
            ],
          ),
        ),
    ]);
  }
}

class _RecentRideRow extends StatelessWidget {
  final Ride ride;
  const _RecentRideRow({required this.ride});

  @override
  Widget build(BuildContext context) {
    final route =
        '${ride.fromLocationName ?? 'Origin'} → ${ride.toLocationName ?? 'Destination'}';
    final fare = ride.finalFare ?? ride.estimatedFare;
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 39,
          height: 39,
          decoration: BoxDecoration(
            color: TriSafeColors.softGreen,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            ride.vehicleType == 'HABAL_HABAL'
                ? Icons.two_wheeler_outlined
                : Icons.electric_rickshaw_outlined,
            color: TriSafeColors.forest,
            size: 20,
          ),
        ),
        const SizedBox(width: 11),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(route,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
            const SizedBox(height: 3),
            Text(
              '${_formatDate(ride.startedAt)} · ${_vehicleLabel(ride.vehicleType)}',
              style: const TextStyle(fontSize: 10, color: TriSafeColors.muted),
            ),
          ]),
        ),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('₱${fare.toStringAsFixed(2)}',
              style: const TextStyle(
                  color: TriSafeColors.forest,
                  fontSize: 13,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(
            ride.isRated ? 'Rated ${ride.ratingScore ?? ''}★' : 'Completed',
            style: const TextStyle(fontSize: 9, color: TriSafeColors.muted),
          ),
        ]),
      ]),
    );
  }
}

class _EmptyRideHistory extends StatelessWidget {
  final VoidCallback onViewAll;
  const _EmptyRideHistory({required this.onViewAll});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(children: [
          const Icon(Icons.route_outlined,
              color: TriSafeColors.muted, size: 33),
          const SizedBox(height: 8),
          const Text('No completed rides yet',
              style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          const Text(
            'Your verified journeys will appear here after you end a ride.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10, color: TriSafeColors.muted),
          ),
        ]),
      );
}

String _formatDate(DateTime? date) {
  if (date == null) return 'Date unavailable';
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
  return '${months[date.month - 1]} ${date.day}';
}

String _vehicleLabel(String type) =>
    type == 'HABAL_HABAL' ? 'Habal-habal' : 'Tricycle';
