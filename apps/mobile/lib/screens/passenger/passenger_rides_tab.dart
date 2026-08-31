import 'package:flutter/material.dart';

import '../../models/ride_models.dart';
import '../../services/trisafe_api.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/passenger_page_header.dart';
import '../../widgets/passenger_rating_dialog.dart';
import '../../widgets/incident_report_dialog.dart';

enum RideHistoryPeriod { day, week, month }

enum RideVehicleFilter { all, tricycle, habalHabal }

class PassengerRidesTab extends StatefulWidget {
  final TriSafeApi api;
  final int refreshVersion;
  final ValueChanged<String> onError;
  const PassengerRidesTab(
      {super.key,
      required this.api,
      required this.refreshVersion,
      required this.onError});
  @override
  State<PassengerRidesTab> createState() => _PassengerRidesTabState();
}

class _PassengerRidesTabState extends State<PassengerRidesTab> {
  RideHistoryPeriod period = RideHistoryPeriod.week;
  RideVehicleFilter vehicleFilter = RideVehicleFilter.all;
  bool newestFirst = true;
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
    if (widget.refreshVersion != oldWidget.refreshVersion) _loadHistory();
  }

  Future<void> _loadHistory() async {
    final request = ++requestNumber;
    final range = _selectedRange(period, anchorDate);
    if (mounted) setState(() => loading = true);
    try {
      final result =
          await widget.api.rideHistory(from: range.start, to: range.end);
      if (!mounted || request != requestNumber) return;
      setState(() {
        rides = result..sort((a, b) => _rideDate(b).compareTo(_rideDate(a)));
        loading = false;
      });
    } catch (_) {
      if (!mounted || request != requestNumber) return;
      setState(() => loading = false);
      widget.onError('Your ride history could not be loaded for this period.');
    }
  }

  Future<void> _openPeriodPicker() async {
    final selection = await showModalBottomSheet<
        ({RideHistoryPeriod period, DateTime anchor})>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _PeriodPickerSheet(period: period, anchorDate: anchorDate),
    );
    if (selection == null || !mounted) return;
    setState(() {
      period = selection.period;
      anchorDate = selection.anchor;
    });
    await _loadHistory();
  }

  Future<void> _openVehiclePicker() async {
    final selected = await showModalBottomSheet<RideVehicleFilter>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _SelectionSheet<RideVehicleFilter>(
        eyebrow: 'RIDE HISTORY',
        title: 'Filter by vehicle',
        description: 'Show only the transport type you used.',
        actionLabel: 'Apply vehicle filter',
        selected: vehicleFilter,
        options: const [
          _PickerOption(
              value: RideVehicleFilter.all,
              label: 'All rides',
              detail: 'Show every ride in this period',
              icon: Icons.list_alt_rounded),
          _PickerOption(
              value: RideVehicleFilter.tricycle,
              label: 'Tricycle',
              detail: 'Show your tricycle rides',
              icon: Icons.electric_rickshaw_rounded),
          _PickerOption(
              value: RideVehicleFilter.habalHabal,
              label: 'Habal-habal',
              detail: 'Show your motorcycle rides',
              icon: Icons.two_wheeler_rounded),
        ],
      ),
    );
    if (selected != null && mounted) setState(() => vehicleFilter = selected);
  }

  Future<void> _openSortPicker() async {
    final selected = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _SelectionSheet<bool>(
        eyebrow: 'RIDE HISTORY',
        title: 'Sort your rides',
        description: 'Choose the order that is easiest for you to review.',
        actionLabel: 'Apply sort order',
        selected: newestFirst,
        options: const [
          _PickerOption(
              value: true,
              label: 'Newest first',
              detail: 'Show your most recent ride at the top',
              icon: Icons.south_rounded),
          _PickerOption(
              value: false,
              label: 'Oldest first',
              detail: 'Show your earliest ride at the top',
              icon: Icons.north_rounded),
        ],
      ),
    );
    if (selected != null && mounted) setState(() => newestFirst = selected);
  }

  Future<void> _openDetails(Ride ride) async {
    final rated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RideDetailsSheet(ride: ride, api: widget.api),
    );
    if (rated == true) _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    final shownRides = rides
        .where((ride) => switch (vehicleFilter) {
              RideVehicleFilter.all => true,
              RideVehicleFilter.tricycle => ride.vehicleType == 'TRICYCLE',
              RideVehicleFilter.habalHabal => ride.vehicleType == 'HABAL_HABAL',
            })
        .toList()
      ..sort((a, b) => newestFirst
          ? _rideDate(b).compareTo(_rideDate(a))
          : _rideDate(a).compareTo(_rideDate(b)));
    final completed =
        shownRides.where((ride) => ride.status == 'COMPLETED').length;
    final totalFare = shownRides
        .where((ride) => ride.status == 'COMPLETED')
        .fold<double>(
            0, (sum, ride) => sum + (ride.finalFare ?? ride.estimatedFare));
    final totalDistance = shownRides.fold<double>(
          0,
          (sum, ride) => sum + ride.actualDistanceMeters,
        ) /
        1000;
    final range = _selectedRange(period, anchorDate);
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xfff4faf1), Color(0xfff8faf7), Color(0xffeef7eb)],
        ),
      ),
      child: RefreshIndicator(
        onRefresh: _loadHistory,
        child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(18, 24, 18, 112),
            children: [
              const PassengerPageHeader(
                  eyebrow: 'YOUR JOURNEYS',
                  title: 'Ride history',
                  description:
                      'Review your completed rides and verified trip details.'),
              const SizedBox(height: 18),
              _HistoryFilters(
                  period: period,
                  periodLabel: _rangeLabel(period, range),
                  vehicleFilter: vehicleFilter,
                  newestFirst: newestFirst,
                  onChoosePeriod: _openPeriodPicker,
                  onChooseVehicle: _openVehiclePicker,
                  onChooseSort: _openSortPicker),
              const SizedBox(height: 14),
              _JourneySummary(
                  completed: completed,
                  totalFare: totalFare,
                  totalDistance: totalDistance),
              const SizedBox(height: 22),
              Row(children: [
                const Expanded(
                    child: Text('Ride records',
                        style: TextStyle(
                            fontSize: 17, fontWeight: FontWeight.w900))),
                _RecordCount(count: shownRides.length)
              ]),
              const SizedBox(height: 4),
              const Text(
                  'Tap a record to view the complete verified ride details.',
                  style: TextStyle(fontSize: 11, color: TriSafeColors.muted)),
              const SizedBox(height: 12),
              if (loading)
                ...List.generate(3, (_) => const _RideSkeleton())
              else if (shownRides.isEmpty)
                const _EmptyPeriod()
              else
                ...shownRides.map((ride) => _RideRecordCard(
                    ride: ride, onTap: () => _openDetails(ride))),
              const _HistoryPrivacyNote(),
            ]),
      ),
    );
  }
}

class _HistoryFilters extends StatelessWidget {
  final RideHistoryPeriod period;
  final String periodLabel;
  final RideVehicleFilter vehicleFilter;
  final bool newestFirst;
  final VoidCallback onChoosePeriod;
  final VoidCallback onChooseVehicle;
  final VoidCallback onChooseSort;
  const _HistoryFilters(
      {required this.period,
      required this.periodLabel,
      required this.vehicleFilter,
      required this.newestFirst,
      required this.onChoosePeriod,
      required this.onChooseVehicle,
      required this.onChooseSort});
  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(
          flex: 14,
          child: Tooltip(
            message: 'Choose date period',
            child: InkWell(
              onTap: onChoosePeriod,
              borderRadius: BorderRadius.circular(10),
              child: _FilterControl(
                icon: Icons.calendar_today_outlined,
                label: periodLabel,
                semanticLabel: 'Date range: $periodLabel',
              ),
            ),
          ),
        ),
        const SizedBox(width: 7),
        Expanded(
          flex: 11,
          child: Tooltip(
            message: 'Filter vehicle type',
            child: InkWell(
              onTap: onChooseVehicle,
              borderRadius: BorderRadius.circular(10),
              child: _FilterControl(
                icon: Icons.directions_transit_outlined,
                label: _vehicleFilterLabel(vehicleFilter),
                semanticLabel:
                    'Vehicle filter: ${_vehicleFilterLabel(vehicleFilter)}',
              ),
            ),
          ),
        ),
        const SizedBox(width: 7),
        Expanded(
          flex: 11,
          child: Tooltip(
            message: 'Change record order',
            child: InkWell(
              onTap: onChooseSort,
              borderRadius: BorderRadius.circular(10),
              child: _FilterControl(
                icon: Icons.swap_vert_rounded,
                label: newestFirst ? 'Newest first' : 'Oldest first',
                semanticLabel:
                    'Sort: ${newestFirst ? 'newest first' : 'oldest first'}',
              ),
            ),
          ),
        ),
      ]);
}

class _PeriodPickerSheet extends StatefulWidget {
  final RideHistoryPeriod period;
  final DateTime anchorDate;
  const _PeriodPickerSheet({required this.period, required this.anchorDate});
  @override
  State<_PeriodPickerSheet> createState() => _PeriodPickerSheetState();
}

class _PeriodPickerSheetState extends State<_PeriodPickerSheet> {
  late RideHistoryPeriod period = widget.period;
  late DateTime anchorDate = widget.anchorDate;

  void _move(int direction) {
    final candidate = _shiftPeriod(period, anchorDate, direction);
    if (candidate.isAfter(DateTime.now())) return;
    setState(() => anchorDate = candidate);
  }

  @override
  Widget build(BuildContext context) {
    final range = _selectedRange(period, anchorDate);
    final canMoveNext = _shiftPeriod(period, anchorDate, 1)
        .isBefore(DateTime.now().add(const Duration(days: 1)));
    return SafeArea(
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
                  color: TriSafeColors.line,
                  borderRadius: BorderRadius.circular(99))),
          const SizedBox(height: 18),
          Row(children: [
            const Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('VIEW RIDE HISTORY',
                      style: TextStyle(
                          fontSize: 9,
                          letterSpacing: 1,
                          color: TriSafeColors.forest,
                          fontWeight: FontWeight.w900)),
                  SizedBox(height: 3),
                  Text('Choose a time period',
                      style:
                          TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
                ])),
            IconButton(
                onPressed: () => Navigator.of(context).pop(),
                tooltip: 'Close period picker',
                icon: const Icon(Icons.close_rounded)),
          ]),
          const SizedBox(height: 16),
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
                selected: {period},
                showSelectedIcon: false,
                onSelectionChanged: (values) =>
                    setState(() => period = values.first),
              )),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
            decoration: BoxDecoration(
                color: TriSafeColors.softGreen,
                borderRadius: BorderRadius.circular(16)),
            child: Row(children: [
              IconButton(
                  onPressed: () => _move(-1),
                  tooltip: 'Previous ${period.name}',
                  icon: const Icon(Icons.chevron_left_rounded)),
              Expanded(
                  child: Column(children: [
                Text(_periodPickerLabel(period),
                    style: const TextStyle(
                        fontSize: 8,
                        color: TriSafeColors.forest,
                        fontWeight: FontWeight.w900,
                        letterSpacing: .9)),
                const SizedBox(height: 3),
                Text(_rangeLabel(period, range),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w900)),
              ])),
              IconButton(
                  onPressed: canMoveNext ? () => _move(1) : null,
                  tooltip: 'Next ${period.name}',
                  icon: const Icon(Icons.chevron_right_rounded)),
            ]),
          ),
          const SizedBox(height: 11),
          Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                  onPressed: () => setState(() => anchorDate = DateTime.now()),
                  icon: const Icon(Icons.today_rounded, size: 17),
                  label: Text(
                      'Current ${_periodPickerLabel(period).toLowerCase()}'))),
          const SizedBox(height: 4),
          SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton.icon(
                  onPressed: () => Navigator.of(context)
                      .pop((period: period, anchor: anchorDate)),
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Show ride history'))),
        ]),
      ),
    );
  }
}

class _PickerOption<T> {
  final T value;
  final String label;
  final String detail;
  final IconData icon;
  const _PickerOption(
      {required this.value,
      required this.label,
      required this.detail,
      required this.icon});
}

class _SelectionSheet<T> extends StatefulWidget {
  final String eyebrow;
  final String title;
  final String description;
  final String actionLabel;
  final T selected;
  final List<_PickerOption<T>> options;
  const _SelectionSheet(
      {required this.eyebrow,
      required this.title,
      required this.description,
      required this.actionLabel,
      required this.selected,
      required this.options});
  @override
  State<_SelectionSheet<T>> createState() => _SelectionSheetState<T>();
}

class _SelectionSheetState<T> extends State<_SelectionSheet<T>> {
  late T selected = widget.selected;
  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
          decoration: const BoxDecoration(
              color: Color(0xfffbfcf8),
              borderRadius: BorderRadius.vertical(top: Radius.circular(26))),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                    color: TriSafeColors.line,
                    borderRadius: BorderRadius.circular(99))),
            const SizedBox(height: 18),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                      color: TriSafeColors.softGreen,
                      borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.tune_rounded,
                      color: TriSafeColors.forest)),
              const SizedBox(width: 11),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(widget.eyebrow,
                        style: const TextStyle(
                            fontSize: 9,
                            letterSpacing: 1,
                            color: TriSafeColors.forest,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 2),
                    Text(widget.title,
                        style: const TextStyle(
                            fontSize: 19, fontWeight: FontWeight.w900)),
                  ])),
              IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  tooltip: 'Close selection',
                  icon: const Icon(Icons.close_rounded)),
            ]),
            const SizedBox(height: 10),
            Align(
                alignment: Alignment.centerLeft,
                child: Text(widget.description,
                    style: const TextStyle(
                        fontSize: 11,
                        height: 1.35,
                        color: TriSafeColors.muted))),
            const SizedBox(height: 16),
            ...widget.options.map((option) => Padding(
                  padding: const EdgeInsets.only(bottom: 9),
                  child: _SelectionOptionTile<T>(
                      option: option,
                      selected: selected == option.value,
                      onTap: () => setState(() => selected = option.value)),
                )),
            const SizedBox(height: 5),
            SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton.icon(
                    onPressed: () => Navigator.of(context).pop(selected),
                    icon: const Icon(Icons.check_rounded),
                    label: Text(widget.actionLabel))),
          ]),
        ),
      );
}

class _SelectionOptionTile<T> extends StatelessWidget {
  final _PickerOption<T> option;
  final bool selected;
  final VoidCallback onTap;
  const _SelectionOptionTile(
      {required this.option, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        label: '${option.label}. ${option.detail}',
        child: Material(
          color: selected ? const Color(0xffeef8ea) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              constraints: const BoxConstraints(minHeight: 68),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
              decoration: BoxDecoration(
                  border: Border.all(
                      color: selected
                          ? const Color(0xff9fce92)
                          : TriSafeColors.line),
                  borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                Container(
                    width: 38,
                    height: 38,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: selected
                            ? TriSafeColors.forest
                            : TriSafeColors.softGreen,
                        borderRadius: BorderRadius.circular(12)),
                    child: Icon(option.icon,
                        size: 19,
                        color: selected ? Colors.white : TriSafeColors.forest)),
                const SizedBox(width: 12),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(option.label,
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 2),
                      Text(option.detail,
                          style: const TextStyle(
                              fontSize: 10,
                              color: TriSafeColors.muted,
                              height: 1.25)),
                    ])),
                const SizedBox(width: 8),
                Icon(
                    selected
                        ? Icons.check_circle_rounded
                        : Icons.radio_button_unchecked_rounded,
                    color: selected
                        ? TriSafeColors.forest
                        : const Color(0xffaeb9aa),
                    size: 21),
              ]),
            ),
          ),
        ),
      );
}

class _FilterControl extends StatelessWidget {
  final IconData icon;
  final String label;
  final String semanticLabel;
  const _FilterControl(
      {required this.icon, required this.label, required this.semanticLabel});

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: semanticLabel,
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .9),
            border: Border.all(color: const Color(0xffd8e6d3)),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(children: [
            Icon(icon, color: TriSafeColors.forest, size: 15),
            const SizedBox(width: 5),
            Expanded(
                child: Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 9.5, fontWeight: FontWeight.w800))),
            const Icon(Icons.keyboard_arrow_down_rounded,
                size: 15, color: TriSafeColors.muted),
          ]),
        ),
      );
}

class _JourneySummary extends StatelessWidget {
  final int completed;
  final double totalFare;
  final double totalDistance;
  const _JourneySummary(
      {required this.completed,
      required this.totalFare,
      required this.totalDistance});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xff101610), Color(0xff1d2a1e)],
          ),
          border: Border.all(color: const Color(0xff354235)),
          borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.insights_rounded, size: 18, color: Color(0xff93df65)),
          SizedBox(width: 8),
          Text('JOURNEY SUMMARY',
              style: TextStyle(
                  fontSize: 10,
                  color: Color(0xffa8d89b),
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2))
        ]),
        const SizedBox(height: 14),
        Row(children: [
          _SummaryMetric(value: '$completed', label: 'Completed rides'),
          const _SummaryDivider(),
          _SummaryMetric(
              value: '₱${totalFare.toStringAsFixed(2)}',
              label: 'Recorded fares'),
          const _SummaryDivider(),
          _SummaryMetric(
              value: '${totalDistance.toStringAsFixed(1)} km',
              label: 'Tracked distance')
        ]),
      ]));
}

class _SummaryMetric extends StatelessWidget {
  final String value;
  final String label;
  const _SummaryMetric({required this.value, required this.label});
  @override
  Widget build(BuildContext context) => Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 3),
        Text(label,
            maxLines: 2,
            style: const TextStyle(
                color: Color(0xffb5bdb5),
                fontSize: 8,
                height: 1.25,
                fontWeight: FontWeight.w700))
      ]));
}

class _SummaryDivider extends StatelessWidget {
  const _SummaryDivider();
  @override
  Widget build(BuildContext context) => Container(
      width: 1,
      height: 32,
      margin: const EdgeInsets.symmetric(horizontal: 9),
      color: Colors.white.withValues(alpha: .14));
}

class _RecordCount extends StatelessWidget {
  final int count;
  const _RecordCount({required this.count});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
          color: TriSafeColors.softGreen,
          borderRadius: BorderRadius.circular(99)),
      child: Text('$count ${count == 1 ? 'ride' : 'rides'}',
          style: const TextStyle(
              color: TriSafeColors.forest,
              fontSize: 10,
              fontWeight: FontWeight.w900)));
}

class _RideRecordCard extends StatelessWidget {
  final Ride ride;
  final VoidCallback onTap;
  const _RideRecordCard({required this.ride, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final completed = ride.status == 'COMPLETED';
    final fare = ride.finalFare ?? ride.currentFare ?? ride.estimatedFare;
    final identifier = _vehicleIdentifier(ride);
    final vehicleIcon = ride.vehicleType == 'HABAL_HABAL'
        ? Icons.two_wheeler_rounded
        : Icons.electric_rickshaw_rounded;
    return Semantics(
        button: true,
        label:
            'View ${completed ? 'completed' : 'active'} ride with ${ride.driverName ?? 'verified driver'}',
        child: Card(
            color: const Color(0xfffbfcf8),
            margin: const EdgeInsets.only(bottom: 12),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
                onTap: onTap,
                child: Padding(
                    padding: const EdgeInsets.fromLTRB(15, 15, 13, 12),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                    width: 43,
                                    height: 43,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                        color: TriSafeColors.softGreen,
                                        borderRadius:
                                            BorderRadius.circular(14)),
                                    child: Icon(vehicleIcon,
                                        color: TriSafeColors.forest, size: 23)),
                                const SizedBox(width: 11),
                                Expanded(
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                      Text(ride.driverName ?? 'Verified driver',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w900)),
                                      const SizedBox(height: 2),
                                      Text(
                                          ride.operatorName ??
                                              'Registered LGU vehicle',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                              fontSize: 10,
                                              color: TriSafeColors.muted,
                                              fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 5),
                                      Wrap(
                                          spacing: 5,
                                          runSpacing: 4,
                                          children: [
                                            _VehiclePill(
                                                label: _vehicleLabel(
                                                    ride.vehicleType)),
                                            if (identifier != null)
                                              _VehiclePill(label: identifier),
                                            if (ride.averageDriverRating !=
                                                    null &&
                                                ride.driverRatingCount > 0)
                                              _RatingPill(
                                                  rating:
                                                      ride.averageDriverRating!)
                                          ]),
                                    ])),
                                const SizedBox(width: 7),
                                Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text('₱${fare.toStringAsFixed(2)}',
                                          style: const TextStyle(
                                              color: TriSafeColors.forest,
                                              fontSize: 15,
                                              fontWeight: FontWeight.w900)),
                                      const SizedBox(height: 6),
                                      _StatusPill(completed: completed)
                                    ]),
                              ]),
                          const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Divider(height: 1)),
                          _RouteRow(
                              icon: Icons.radio_button_checked_rounded,
                              label: 'PICKUP',
                              value: ride.fromLocationName ??
                                  'Pickup location unavailable',
                              color: TriSafeColors.forest),
                          const SizedBox(height: 9),
                          _RouteRow(
                              icon: Icons.location_on_rounded,
                              label: 'DESTINATION',
                              value: ride.toLocationName ??
                                  'Destination unavailable',
                              color: const Color(0xffd84045)),
                          const SizedBox(height: 13),
                          Container(
                              padding: const EdgeInsets.fromLTRB(10, 8, 7, 8),
                              decoration: BoxDecoration(
                                  color: const Color(0xfff7f9f6),
                                  borderRadius: BorderRadius.circular(12)),
                              child: Row(children: [
                                Expanded(
                                    child: _TimeItem(
                                        icon: Icons.login_rounded,
                                        label: 'START',
                                        value: _shortDateTime(ride.startedAt))),
                                Container(
                                    width: 1,
                                    height: 28,
                                    color: TriSafeColors.line),
                                Expanded(
                                    child: _TimeItem(
                                        icon: completed
                                            ? Icons.logout_rounded
                                            : Icons.schedule_rounded,
                                        label: completed ? 'END' : 'STATUS',
                                        value: completed
                                            ? _shortDateTime(ride.endedAt)
                                            : 'Ride in progress')),
                                TextButton.icon(
                                    onPressed: onTap,
                                    icon: const Icon(
                                        Icons.arrow_forward_rounded,
                                        size: 15),
                                    label: const Text('Details')),
                              ])),
                        ])))));
  }
}

class _VehiclePill extends StatelessWidget {
  final String label;
  const _VehiclePill({required this.label});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
          color: TriSafeColors.softGreen,
          borderRadius: BorderRadius.circular(7)),
      child: Text(label,
          style: const TextStyle(
              fontSize: 7.5,
              color: TriSafeColors.forest,
              fontWeight: FontWeight.w900)));
}

class _RatingPill extends StatelessWidget {
  final double rating;
  const _RatingPill({required this.rating});
  @override
  Widget build(BuildContext context) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.star_rounded, size: 13, color: Color(0xffb17800)),
        const SizedBox(width: 2),
        Text(rating.toStringAsFixed(1),
            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800))
      ]);
}

class _StatusPill extends StatelessWidget {
  final bool completed;
  const _StatusPill({required this.completed});
  @override
  Widget build(BuildContext context) {
    final color = completed ? TriSafeColors.forest : const Color(0xff166c86);
    return Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
            color: color.withValues(alpha: .10),
            borderRadius: BorderRadius.circular(7)),
        child: Text(completed ? 'COMPLETED' : 'ACTIVE',
            style: TextStyle(
                fontSize: 7.5,
                color: color,
                fontWeight: FontWeight.w900,
                letterSpacing: .4)));
  }
}

class _RouteRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _RouteRow(
      {required this.icon,
      required this.label,
      required this.value,
      required this.color});
  @override
  Widget build(BuildContext context) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(icon, size: 15, color: color)),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: TextStyle(
                  fontSize: 8,
                  color: color,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .8)),
          const SizedBox(height: 2),
          Text(value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 11, height: 1.3, fontWeight: FontWeight.w700))
        ]))
      ]);
}

class _TimeItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _TimeItem(
      {required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(left: 2, right: 7),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 14, color: TriSafeColors.forest),
        const SizedBox(width: 5),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 7,
                  color: TriSafeColors.muted,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .6)),
          const SizedBox(height: 1),
          Text(value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 8.5, height: 1.25, fontWeight: FontWeight.w800))
        ]))
      ]));
}

class _HistoryPrivacyNote extends StatelessWidget {
  const _HistoryPrivacyNote();
  @override
  Widget build(BuildContext context) => Container(
      margin: const EdgeInsets.only(top: 3),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
          color: TriSafeColors.softGreen,
          borderRadius: BorderRadius.circular(14)),
      child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.verified_user_outlined,
            size: 18, color: TriSafeColors.forest),
        SizedBox(width: 9),
        Expanded(
            child: Text(
                'Your ride records are private and are available only to your authenticated TriSafe account.',
                style: TextStyle(
                    fontSize: 10,
                    height: 1.4,
                    color: TriSafeColors.muted,
                    fontWeight: FontWeight.w600)))
      ]));
}

class _RideDetailsSheet extends StatelessWidget {
  final Ride ride;
  final TriSafeApi api;
  const _RideDetailsSheet({required this.ride, required this.api});
  @override
  Widget build(BuildContext context) {
    final completed = ride.status == 'COMPLETED';
    final fare = ride.finalFare ?? ride.currentFare ?? ride.estimatedFare;
    final identifier = _vehicleIdentifier(ride);
    return SafeArea(
        top: false,
        child: Container(
            margin: const EdgeInsets.only(top: 56),
            decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
            child: DraggableScrollableSheet(
                expand: false,
                initialChildSize: .82,
                minChildSize: .55,
                maxChildSize: .94,
                builder: (context, controller) => ListView(
                        controller: controller,
                        padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
                        children: [
                          Center(
                              child: Container(
                                  width: 42,
                                  height: 4,
                                  decoration: BoxDecoration(
                                      color: TriSafeColors.line,
                                      borderRadius:
                                          BorderRadius.circular(99)))),
                          const SizedBox(height: 18),
                          Row(children: [
                            const Expanded(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                  Text('RIDE DETAILS',
                                      style: TextStyle(
                                          fontSize: 10,
                                          color: TriSafeColors.forest,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.2)),
                                  SizedBox(height: 3),
                                  Text('Verified trip record',
                                      style: TextStyle(
                                          fontSize: 21,
                                          fontWeight: FontWeight.w900))
                                ])),
                            _StatusPill(completed: completed),
                            const SizedBox(width: 4),
                            IconButton(
                              onPressed: () => Navigator.of(context).pop(),
                              tooltip: 'Close ride details',
                              icon: const Icon(Icons.close_rounded),
                            ),
                          ]),
                          const SizedBox(height: 18),
                          _DetailSection(children: [
                            _DetailLine(
                                icon: Icons.person_outline_rounded,
                                label: 'Driver',
                                value: ride.driverName ?? 'Verified driver'),
                            _DetailLine(
                                icon: Icons.business_outlined,
                                label: 'Registered operator',
                                value: ride.operatorName ?? 'Not recorded'),
                            _DetailLine(
                                icon: ride.vehicleType == 'HABAL_HABAL'
                                    ? Icons.two_wheeler_rounded
                                    : Icons.electric_rickshaw_rounded,
                                label: 'Vehicle',
                                value: _vehicleLabel(ride.vehicleType)),
                            if (identifier != null)
                              _DetailLine(
                                  icon: Icons.confirmation_number_outlined,
                                  label: ride.vehicleType == 'HABAL_HABAL'
                                      ? 'Permit number'
                                      : 'Body number',
                                  value: identifier),
                            if (ride.averageDriverRating != null &&
                                ride.driverRatingCount > 0)
                              _DetailLine(
                                  icon: Icons.star_outline_rounded,
                                  label: 'Driver rating',
                                  value:
                                      '${ride.averageDriverRating!.toStringAsFixed(1)} / 5.0')
                          ]),
                          const SizedBox(height: 14),
                          _DetailSection(children: [
                            _DetailLine(
                                icon: Icons.trip_origin_rounded,
                                label: 'Pickup',
                                value: ride.fromLocationName ??
                                    'Pickup location unavailable',
                                accent: TriSafeColors.forest),
                            _DetailLine(
                                icon: Icons.location_on_outlined,
                                label: 'Destination',
                                value: ride.toLocationName ??
                                    'Destination unavailable',
                                accent: const Color(0xffd84045)),
                            _DetailLine(
                                icon: Icons.route_outlined,
                                label: 'Tracked distance',
                                value: _distance(ride)),
                            _DetailLine(
                                icon: Icons.payments_outlined,
                                label: completed
                                    ? 'Final fare'
                                    : 'Current official fare',
                                value: '₱${fare.toStringAsFixed(2)}',
                                accent: TriSafeColors.forest),
                            _DetailLine(
                                icon: Icons.login_rounded,
                                label: 'Started',
                                value: _fullDateTime(ride.startedAt)),
                            if (completed)
                              _DetailLine(
                                  icon: Icons.logout_rounded,
                                  label: 'Ended',
                                  value: _fullDateTime(ride.endedAt))
                          ]),
                          if (completed) ...[
                            const SizedBox(height: 14),
                            SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: OutlinedButton.icon(
                                onPressed: () => showIncidentReport(
                                    context, api,
                                    rideId: ride.id),
                                icon: const Icon(Icons.report_problem_outlined),
                                label: const Text(
                                    'Report an issue with this ride'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xffa92d34),
                                  side: const BorderSide(
                                      color: Color(0xffe4b5b8)),
                                ),
                              ),
                            ),
                          ],
                          if (completed && !ride.isRated) ...[
                            const SizedBox(height: 16),
                            SizedBox(
                                height: 50,
                                child: FilledButton.icon(
                                    onPressed: () async {
                                      final rated =
                                          await showPassengerRatingDialog(
                                              context, api, ride);
                                      if (context.mounted && rated) {
                                        Navigator.of(context).pop(true);
                                      }
                                    },
                                    icon:
                                        const Icon(Icons.star_outline_rounded),
                                    label:
                                        const Text('Rate this verified ride')))
                          ] else if (ride.isRated) ...[
                            const SizedBox(height: 14),
                            Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                    color: TriSafeColors.softGreen,
                                    borderRadius: BorderRadius.circular(13)),
                                child: Row(children: [
                                  const Icon(Icons.star_rounded,
                                      size: 18, color: Color(0xffb17800)),
                                  const SizedBox(width: 8),
                                  Text(
                                      'You rated this ride ${ride.ratingScore ?? ''}/5.',
                                      style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800))
                                ]))
                          ],
                        ]))));
  }
}

class _DetailSection extends StatelessWidget {
  final List<Widget> children;
  const _DetailSection({required this.children});
  @override
  Widget build(BuildContext context) => Container(
      decoration: BoxDecoration(
          border: Border.all(color: TriSafeColors.line),
          borderRadius: BorderRadius.circular(18)),
      child: Column(children: children));
}

class _DetailLine extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? accent;
  const _DetailLine(
      {required this.icon,
      required this.label,
      required this.value,
      this.accent});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: accent ?? TriSafeColors.forest),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label.toUpperCase(),
              style: const TextStyle(
                  fontSize: 8,
                  letterSpacing: .8,
                  color: TriSafeColors.muted,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 3),
          Text(value,
              style: TextStyle(
                  fontSize: 12,
                  height: 1.3,
                  fontWeight: FontWeight.w800,
                  color: label.contains('fare')
                      ? TriSafeColors.forest
                      : TriSafeColors.black))
        ]))
      ]));
}

class _RideSkeleton extends StatelessWidget {
  const _RideSkeleton();
  @override
  Widget build(BuildContext context) => Container(
      height: 240,
      margin: const EdgeInsets.only(bottom: 12),
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
        Text(
            'Choose another day, week, or month to view earlier verified journeys.',
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
      )
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

DateTime _rideDate(Ride ride) =>
    ride.startedAt ?? ride.endedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
String _vehicleLabel(String type) =>
    type == 'HABAL_HABAL' ? 'Habal-habal' : 'Tricycle';
String _vehicleFilterLabel(RideVehicleFilter value) => switch (value) {
      RideVehicleFilter.all => 'All rides',
      RideVehicleFilter.tricycle => 'Tricycle',
      RideVehicleFilter.habalHabal => 'Habal-habal',
    };
String _periodPickerLabel(RideHistoryPeriod value) => switch (value) {
      RideHistoryPeriod.day => 'Day',
      RideHistoryPeriod.week => 'Week',
      RideHistoryPeriod.month => 'Month',
    };
DateTime _shiftPeriod(
        RideHistoryPeriod period, DateTime anchor, int direction) =>
    switch (period) {
      RideHistoryPeriod.day => anchor.add(Duration(days: direction)),
      RideHistoryPeriod.week => anchor.add(Duration(days: 7 * direction)),
      RideHistoryPeriod.month =>
        DateTime(anchor.year, anchor.month + direction, 1),
    };
String? _vehicleIdentifier(Ride ride) {
  final value =
      ride.vehicleType == 'HABAL_HABAL' ? ride.permitNumber : ride.bodyNumber;
  if (value == null || value.trim().isEmpty) return null;
  return '${ride.vehicleType == 'HABAL_HABAL' ? 'Permit' : 'Body'} $value';
}

String _distance(Ride ride) =>
    '${(ride.actualDistanceMeters / 1000).toStringAsFixed(2)} km';
String _shortDateTime(DateTime? value) {
  if (value == null) return 'Not recorded';
  final local = value.toLocal();
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  return '${_shortDate(local)}\n$hour:${local.minute.toString().padLeft(2, '0')} ${local.hour >= 12 ? 'PM' : 'AM'}';
}

String _fullDateTime(DateTime? value) {
  if (value == null) return 'Not recorded';
  final local = value.toLocal();
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  return '${_month(local.month)} ${local.day}, ${local.year} · $hour:${local.minute.toString().padLeft(2, '0')} ${local.hour >= 12 ? 'PM' : 'AM'}';
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
