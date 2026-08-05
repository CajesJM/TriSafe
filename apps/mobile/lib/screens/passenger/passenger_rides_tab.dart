import 'package:flutter/material.dart';
import '../../models/ride_models.dart';
import '../../services/trisafe_api.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger_page_header.dart';

enum RideHistoryPeriod { day, week, month }

class PassengerRidesTab extends StatefulWidget {
  final TriSafeApi api;
  final int refreshVersion;
  final ValueChanged<String> onError;

  const PassengerRidesTab({
    super.key,
    required this.api,
    required this.refreshVersion,
    required this.onError,
  });

  @override
  State<PassengerRidesTab> createState() => _PassengerRidesTabState();
}

class _PassengerRidesTabState extends State<PassengerRidesTab> {
  RideHistoryPeriod period = RideHistoryPeriod.week;
  DateTime anchorDate = DateTime.now();
  List<Ride> rides = [];
  bool loading = true;
  int requestNumber = 0;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void didUpdateWidget(covariant PassengerRidesTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.refreshVersion != oldWidget.refreshVersion) {
      _loadHistory();
    }
  }

  Future<void> _loadHistory() async {
    final currentRequest = ++requestNumber;
    final range = _selectedRange(period, anchorDate);
    if (mounted) setState(() => loading = true);
    try {
      final result =
          await widget.api.rideHistory(from: range.start, to: range.end);
      if (!mounted || currentRequest != requestNumber) return;
      setState(() {
        rides = result;
        loading = false;
      });
    } catch (_) {
      if (!mounted || currentRequest != requestNumber) return;
      setState(() => loading = false);
      widget.onError('Your ride history could not be loaded for this period.');
    }
  }

  Future<void> _chooseDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: anchorDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      helpText: period == RideHistoryPeriod.day
          ? 'SELECT RIDE DATE'
          : 'SELECT A DATE WITHIN THE PERIOD',
    );
    if (selected == null || !mounted) return;
    setState(() => anchorDate = selected);
    await _loadHistory();
  }

  Future<void> _changePeriod(RideHistoryPeriod value) async {
    if (value == period) return;
    setState(() => period = value);
    await _loadHistory();
  }

  Future<void> _movePeriod(int direction) async {
    final candidate = switch (period) {
      RideHistoryPeriod.day => anchorDate.add(Duration(days: direction)),
      RideHistoryPeriod.week => anchorDate.add(Duration(days: 7 * direction)),
      RideHistoryPeriod.month =>
        DateTime(anchorDate.year, anchorDate.month + direction, 1),
    };
    if (candidate.isAfter(DateTime.now())) return;
    setState(() => anchorDate = candidate);
    await _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    final completed = rides.where((ride) => ride.status == 'COMPLETED').length;
    final totalFare = rides.fold<double>(
        0, (sum, ride) => sum + (ride.finalFare ?? ride.estimatedFare));
    final totalDistance =
        rides.fold<double>(0, (sum, ride) => sum + ride.actualDistanceMeters) /
            1000;
    final range = _selectedRange(period, anchorDate);

    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
        children: [
          const PassengerPageHeader(
            eyebrow: 'YOUR JOURNEYS',
            title: 'Ride history',
            description:
                'Only rides belonging to your authenticated passenger account are shown here.',
          ),
          const SizedBox(height: 20),
          _HistoryFilters(
            period: period,
            periodLabel: _rangeLabel(period, range),
            canMoveForward: range.end.isBefore(DateTime.now()),
            onPeriodChanged: _changePeriod,
            onChooseDate: _chooseDate,
            onPrevious: () => _movePeriod(-1),
            onNext: () => _movePeriod(1),
          ),
          const SizedBox(height: 14),
          LayoutBuilder(builder: (context, constraints) {
            final width = constraints.maxWidth >= 620
                ? (constraints.maxWidth - 20) / 3
                : (constraints.maxWidth - 10) / 2;
            return Wrap(spacing: 10, runSpacing: 10, children: [
              SizedBox(
                  width: width,
                  child: _Summary(
                      label: 'Completed rides',
                      value: '$completed',
                      icon: Icons.check_circle_outline_rounded)),
              SizedBox(
                  width: width,
                  child: _Summary(
                      label: 'Total fare',
                      value: '₱${totalFare.toStringAsFixed(2)}',
                      icon: Icons.receipt_long_outlined)),
              SizedBox(
                  width: width,
                  child: _Summary(
                      label: 'Distance',
                      value: '${totalDistance.toStringAsFixed(2)} km',
                      icon: Icons.route_outlined)),
            ]);
          }),
          const SizedBox(height: 20),
          Row(children: [
            const Expanded(
                child: Text('Personal ride records',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w900))),
            Text('${rides.length} result${rides.length == 1 ? '' : 's'}',
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ]),
          const SizedBox(height: 11),
          if (loading)
            ...List.generate(3, (_) => const _RideSkeleton())
          else if (rides.isEmpty)
            const _EmptyPeriod()
          else
            LayoutBuilder(
                builder: (context, constraints) => constraints.maxWidth >= 720
                    ? _RideHistoryTable(rides: rides)
                    : _RideHistoryCards(rides: rides)),
        ],
      ),
    );
  }
}

class _HistoryFilters extends StatelessWidget {
  final RideHistoryPeriod period;
  final String periodLabel;
  final bool canMoveForward;
  final ValueChanged<RideHistoryPeriod> onPeriodChanged;
  final VoidCallback onChooseDate;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  const _HistoryFilters(
      {required this.period,
      required this.periodLabel,
      required this.canMoveForward,
      required this.onPeriodChanged,
      required this.onChooseDate,
      required this.onPrevious,
      required this.onNext});

  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(children: [
            SizedBox(
                width: double.infinity,
                child: SegmentedButton<RideHistoryPeriod>(
                    segments: const [
                      ButtonSegment(
                          value: RideHistoryPeriod.day,
                          icon: Icon(Icons.today_outlined),
                          label: Text('Day')),
                      ButtonSegment(
                          value: RideHistoryPeriod.week,
                          icon: Icon(Icons.view_week_outlined),
                          label: Text('Week')),
                      ButtonSegment(
                          value: RideHistoryPeriod.month,
                          icon: Icon(Icons.calendar_month_outlined),
                          label: Text('Month')),
                    ],
                    selected: {
                      period
                    },
                    showSelectedIcon: false,
                    onSelectionChanged: (values) =>
                        onPeriodChanged(values.first))),
            const SizedBox(height: 13),
            Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 6),
                decoration: BoxDecoration(
                    color: TriSafeColors.softGreen,
                    borderRadius: BorderRadius.circular(13)),
                child: Row(children: [
                  IconButton(
                      onPressed: onPrevious,
                      icon: const Icon(Icons.chevron_left_rounded),
                      tooltip: 'Previous period'),
                  Expanded(
                      child: InkWell(
                          onTap: onChooseDate,
                          borderRadius: BorderRadius.circular(10),
                          child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Column(children: [
                                const Text('SELECTED PERIOD',
                                    style: TextStyle(
                                        fontSize: 8,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1,
                                        color: TriSafeColors.forest)),
                                const SizedBox(height: 3),
                                Text(periodLabel,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800))
                              ])))),
                  IconButton(
                      onPressed: canMoveForward ? onNext : null,
                      icon: const Icon(Icons.chevron_right_rounded),
                      tooltip: 'Next period'),
                ])),
          ])));
}

class _RideHistoryTable extends StatelessWidget {
  final List<Ride> rides;
  const _RideHistoryTable({required this.rides});
  @override
  Widget build(BuildContext context) => Card(
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(TriSafeColors.softGreen),
            columnSpacing: 26,
            columns: const [
              DataColumn(label: Text('DATE & TIME')),
              DataColumn(label: Text('ORIGIN')),
              DataColumn(label: Text('DESTINATION')),
              DataColumn(label: Text('DISTANCE')),
              DataColumn(label: Text('FARE')),
              DataColumn(label: Text('VEHICLE'))
            ],
            rows: rides
                .map((ride) => DataRow(cells: [
                      DataCell(SizedBox(
                          width: 120,
                          child: Text(_dateTime(ride.startedAt),
                              style: const TextStyle(
                                  fontSize: 10, fontWeight: FontWeight.w700)))),
                      DataCell(SizedBox(
                          width: 130,
                          child: Text(ride.fromLocationName ?? 'Unknown origin',
                              overflow: TextOverflow.ellipsis))),
                      DataCell(SizedBox(
                          width: 130,
                          child: Text(
                              ride.toLocationName ?? 'Unknown destination',
                              overflow: TextOverflow.ellipsis))),
                      DataCell(Text(_distance(ride))),
                      DataCell(Text(
                          '₱${(ride.finalFare ?? ride.estimatedFare).toStringAsFixed(2)}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              color: TriSafeColors.forest))),
                      DataCell(_VehicleBadge(type: ride.vehicleType)),
                    ]))
                .toList(),
          )));
}

class _RideHistoryCards extends StatelessWidget {
  final List<Ride> rides;
  const _RideHistoryCards({required this.rides});
  @override
  Widget build(BuildContext context) => Column(
      children: rides
          .map((ride) => Card(
              margin: const EdgeInsets.only(bottom: 11),
              child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(
                              child: Text(_dateTime(ride.startedAt),
                                  style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800))),
                          _VehicleBadge(type: ride.vehicleType)
                        ]),
                        const Divider(height: 22),
                        _RouteLine(
                            icon: Icons.trip_origin_rounded,
                            label: 'Origin',
                            value: ride.fromLocationName ?? 'Unknown origin'),
                        const SizedBox(height: 10),
                        _RouteLine(
                            icon: Icons.location_on_outlined,
                            label: 'Destination',
                            value:
                                ride.toLocationName ?? 'Unknown destination'),
                        const SizedBox(height: 15),
                        Row(children: [
                          Expanded(
                              child: _SmallValue(
                                  label: 'DISTANCE', value: _distance(ride))),
                          Expanded(
                              child: _SmallValue(
                                  label: 'FARE',
                                  value:
                                      '₱${(ride.finalFare ?? ride.estimatedFare).toStringAsFixed(2)}',
                                  accent: true))
                        ]),
                      ]))))
          .toList());
}

class _RouteLine extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _RouteLine(
      {required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: TriSafeColors.forest, size: 17),
        const SizedBox(width: 9),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label.toUpperCase(),
              style: const TextStyle(
                  fontSize: 8,
                  color: TriSafeColors.muted,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(value,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700))
        ]))
      ]);
}

class _SmallValue extends StatelessWidget {
  final String label;
  final String value;
  final bool accent;
  const _SmallValue(
      {required this.label, required this.value, this.accent = false});
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(
                fontSize: 8,
                color: TriSafeColors.muted,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 3),
        Text(value,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: accent ? TriSafeColors.forest : TriSafeColors.black))
      ]);
}

class _VehicleBadge extends StatelessWidget {
  final String type;
  const _VehicleBadge({required this.type});
  @override
  Widget build(BuildContext context) {
    final label = type.replaceAll('_', '-').toLowerCase();
    return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
            color: TriSafeColors.softGreen,
            borderRadius: BorderRadius.circular(99)),
        child: Text(label[0].toUpperCase() + label.substring(1),
            style: const TextStyle(
                fontSize: 8,
                fontWeight: FontWeight.w900,
                color: TriSafeColors.forest)));
  }
}

class _Summary extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _Summary(
      {required this.label, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(14),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, color: TriSafeColors.forest, size: 19),
            const SizedBox(height: 12),
            Text(value,
                style:
                    const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
            Text(label,
                style: const TextStyle(fontSize: 9, color: TriSafeColors.muted))
          ])));
}

class _RideSkeleton extends StatelessWidget {
  const _RideSkeleton();
  @override
  Widget build(BuildContext context) => Container(
      height: 126,
      margin: const EdgeInsets.only(bottom: 11),
      decoration: BoxDecoration(
          color: const Color(0xffecefec),
          borderRadius: BorderRadius.circular(18)));
}

class _EmptyPeriod extends StatelessWidget {
  const _EmptyPeriod();
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(34),
      decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(18)),
      child: const Column(children: [
        Icon(Icons.event_busy_outlined, size: 38, color: TriSafeColors.muted),
        SizedBox(height: 10),
        Text('No rides in this period',
            style: TextStyle(fontWeight: FontWeight.w900)),
        SizedBox(height: 4),
        Text('Choose another day, week, or month to view earlier journeys.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10, color: TriSafeColors.muted))
      ]));
}

({DateTime start, DateTime end}) _selectedRange(
    RideHistoryPeriod period, DateTime anchor) {
  final day = DateTime(anchor.year, anchor.month, anchor.day);
  return switch (period) {
    RideHistoryPeriod.day => (
        start: day,
        end: day.add(const Duration(days: 1))
      ),
    RideHistoryPeriod.week => (
        start: day.subtract(Duration(days: day.weekday - 1)),
        end: day
            .subtract(Duration(days: day.weekday - 1))
            .add(const Duration(days: 7))
      ),
    RideHistoryPeriod.month => (
        start: DateTime(day.year, day.month),
        end: DateTime(day.year, day.month + 1)
      ),
  };
}

String _rangeLabel(
    RideHistoryPeriod period, ({DateTime start, DateTime end}) range) {
  if (period == RideHistoryPeriod.day) {
    return _dateOnly(range.start);
  }
  if (period == RideHistoryPeriod.month) {
    return '${_month(range.start.month)} ${range.start.year}';
  }
  return '${_shortDate(range.start)} – ${_shortDate(range.end.subtract(const Duration(days: 1)))}';
}

String _dateTime(DateTime? value) {
  if (value == null) {
    return 'Date unavailable';
  }
  final local = value.toLocal();
  final hour =
      local.hour == 0 ? 12 : (local.hour > 12 ? local.hour - 12 : local.hour);
  return '${_shortDate(local)}, ${local.year}\n$hour:${local.minute.toString().padLeft(2, '0')} ${local.hour >= 12 ? 'PM' : 'AM'}';
}

String _dateOnly(DateTime value) =>
    '${_month(value.month)} ${value.day}, ${value.year}';
String _shortDate(DateTime value) =>
    '${_month(value.month).substring(0, 3)} ${value.day}';
String _month(int month) => const [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ][month - 1];
String _distance(Ride ride) =>
    '${(ride.actualDistanceMeters / 1000).toStringAsFixed(2)} km';
