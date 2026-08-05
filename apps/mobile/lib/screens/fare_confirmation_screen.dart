import 'package:flutter/material.dart';
import '../models/vehicle_models.dart';
import '../models/fare_models.dart';

class FareConfirmationScreen extends StatelessWidget {
  final VerifiedVehicle vehicle;
  final LocationOption from;
  final LocationOption to;
  final FareEstimate fare;
  final int passengerCount;

  const FareConfirmationScreen(
      {super.key,
      required this.vehicle,
      required this.from,
      required this.to,
      required this.fare,
      required this.passengerCount});

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Confirm fare')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        const Text('Official fare estimate',
            style: TextStyle(fontSize: 27, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Text('Review the LGU-calculated estimate before starting your ride.',
            style: TextStyle(color: Colors.grey.shade700)),
        const SizedBox(height: 22),
        Card(
            color: const Color(0xffe4f3db),
            child: Padding(
                padding: const EdgeInsets.all(22),
                child: Column(children: [
                  const Text('ESTIMATED FARE',
                      style: TextStyle(
                          fontSize: 11,
                          letterSpacing: 1.5,
                          fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text('PHP ${fare.amount.toStringAsFixed(2)}',
                      style: const TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.w900,
                          color: Color(0xff185449))),
                  Text(
                      '$passengerCount passenger${passengerCount == 1 ? '' : 's'}',
                      style: const TextStyle(color: Color(0xff55766d)))
                ]))),
        const SizedBox(height: 16),
        Card(
            child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(children: [
                  _RouteLine(
                      icon: Icons.trip_origin, label: 'From', value: from.name),
                  const Divider(height: 24),
                  _RouteLine(
                      icon: Icons.location_on, label: 'To', value: to.name)
                ]))),
        const SizedBox(height: 16),
        Card(
            child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Fare breakdown',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 12),
                      _AmountRow(label: 'Base fare', value: fare.baseFare),
                      _AmountRow(
                          label:
                              'Planned distance charge${fare.ratePerKm == null ? '' : ' · PHP ${fare.ratePerKm!.toStringAsFixed(2)}/km'}',
                          value: fare.distanceCharge),
                      _AmountRow(
                          label: 'Passenger surcharge',
                          value: fare.passengerSurcharge),
                      const Divider(),
                      _AmountRow(
                          label: 'Estimated total',
                          value: fare.amount,
                          strong: true),
                      const SizedBox(height: 12),
                      Text(fare.disclaimer,
                          style: TextStyle(
                              color: Colors.grey.shade700, fontSize: 12)),
                      const SizedBox(height: 8),
                      const Text(
                          'The final fare is recalculated from GPS distance when the ride ends.',
                          style: TextStyle(
                              color: Color(0xff185449),
                              fontSize: 12,
                              fontWeight: FontWeight.w700))
                    ]))),
        const SizedBox(height: 24),
        SizedBox(
            height: 52,
            child: FilledButton.icon(
                onPressed: () => Navigator.of(context).pop(RidePlan(
                    from: from,
                    to: to,
                    fare: fare,
                    passengerCount: passengerCount)),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Start ride'))),
      ]));
}

class _RouteLine extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _RouteLine(
      {required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Row(children: [
        Icon(icon, color: const Color(0xff185449)),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700))
        ])
      ]);
}

class _AmountRow extends StatelessWidget {
  final String label;
  final double value;
  final bool strong;
  const _AmountRow(
      {required this.label, required this.value, this.strong = false});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        Expanded(
            child: Text(label,
                style: TextStyle(
                    fontWeight: strong ? FontWeight.w800 : FontWeight.normal))),
        Text('PHP ${value.toStringAsFixed(2)}',
            style: TextStyle(
                fontWeight: strong ? FontWeight.w900 : FontWeight.w600))
      ]));
}
