import 'package:flutter/material.dart';
import '../../models/driver_violation_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';

class DriverViolationsScreen extends StatefulWidget {
  final List<DriverViolationRecord> violations;

  const DriverViolationsScreen({super.key, required this.violations});

  @override
  State<DriverViolationsScreen> createState() => _DriverViolationsScreenState();
}

class _DriverViolationsScreenState extends State<DriverViolationsScreen> {
  String _filter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final records = widget.violations.where((record) {
      if (_filter == 'ALL') return true;
      if (_filter == 'OPEN') {
        return record.status == 'OPEN' || record.status == 'ACKNOWLEDGED';
      }
      return record.status == _filter;
    }).toList();
    final open = widget.violations
        .where((record) =>
            record.status == 'OPEN' || record.status == 'ACKNOWLEDGED')
        .length;
    final pending = widget.violations
        .where((record) => record.penaltyStatus == 'PENDING')
        .length;
    final resolved =
        widget.violations.where((record) => record.status == 'RESOLVED').length;

    return Scaffold(
      backgroundColor: TriSafeColors.offWhite,
      appBar: AppBar(title: const Text('Violations & penalties')),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
          children: [
            const DriverPageHeader(
              eyebrow: 'LGU COMPLIANCE RECORD',
              title: 'Violations & penalties',
              description:
                  'Review official LGU records issued to your driver account.',
            ),
            const SizedBox(height: 16),
            _ReadOnlyNotice(),
            const SizedBox(height: 16),
            LayoutBuilder(builder: (context, constraints) {
              final cardWidth = constraints.maxWidth >= 590
                  ? (constraints.maxWidth - 24) / 3
                  : (constraints.maxWidth - 12) / 2;
              return Wrap(spacing: 12, runSpacing: 12, children: [
                _Metric(
                    width: cardWidth,
                    label: 'Open cases',
                    value: open.toString(),
                    icon: Icons.gavel_outlined,
                    color: TriSafeColors.danger),
                _Metric(
                    width: cardWidth,
                    label: 'Pending penalties',
                    value: pending.toString(),
                    icon: Icons.receipt_long_outlined,
                    color: const Color(0xff8a5a00)),
                _Metric(
                    width: cardWidth,
                    label: 'Resolved',
                    value: resolved.toString(),
                    icon: Icons.task_alt_rounded,
                    color: TriSafeColors.forest),
              ]);
            }),
            const SizedBox(height: 22),
            const Text('Official records',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: [
                for (final item in const [
                  ('ALL', 'All'),
                  ('OPEN', 'Open'),
                  ('RESOLVED', 'Resolved'),
                  ('DISMISSED', 'Dismissed'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(item.$2),
                      selected: _filter == item.$1,
                      onSelected: (_) => setState(() => _filter = item.$1),
                    ),
                  ),
              ]),
            ),
            const SizedBox(height: 12),
            if (records.isEmpty)
              _EmptyRecords(hasAnyRecords: widget.violations.isNotEmpty)
            else
              ...records.map((record) => _ViolationCard(
                    record: record,
                    onOpen: () => _showDetails(context, record),
                  )),
          ],
        ),
      ),
    );
  }
}

class _ReadOnlyNotice extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
            color: const Color(0xfffff4df),
            border: Border.all(color: const Color(0xffffddb0)),
            borderRadius: BorderRadius.circular(16)),
        child:
            const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.info_outline_rounded, color: Color(0xff8a5a00), size: 21),
          SizedBox(width: 10),
          Expanded(
            child: Text(
                'These are official LGU/BPLO records. TriSafe does not accept penalty payments or settlements in the Driver app.',
                style: TextStyle(
                    fontSize: 10, height: 1.5, color: Color(0xff6f500f))),
          ),
        ]),
      );
}

class _Metric extends StatelessWidget {
  final double width;
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _Metric({
    required this.width,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) => SizedBox(
        width: width,
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(15),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(icon, color: color, size: 21),
              const SizedBox(height: 12),
              Text(value,
                  style: const TextStyle(
                      fontSize: 24, fontWeight: FontWeight.w900)),
              Text(label,
                  style: const TextStyle(
                      fontSize: 10, fontWeight: FontWeight.w800)),
            ]),
          ),
        ),
      );
}

class _ViolationCard extends StatelessWidget {
  final DriverViolationRecord record;
  final VoidCallback onOpen;

  const _ViolationCard({required this.record, required this.onOpen});

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _StatusIcon(status: record.status),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                          child: Text(record.category,
                              style: const TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w900)),
                        ),
                        _StatusPill(status: record.status),
                      ]),
                      const SizedBox(height: 5),
                      Text(_label(record.offenseLevel),
                          style: const TextStyle(
                              color: TriSafeColors.forest,
                              fontSize: 9,
                              letterSpacing: .5,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 5),
                      Text(record.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 10,
                              height: 1.45,
                              color: TriSafeColors.muted)),
                      const SizedBox(height: 9),
                      Text('${_date(record.occurredAt)} · ${_penalty(record)}',
                          style: const TextStyle(
                              fontSize: 9,
                              color: TriSafeColors.muted,
                              fontWeight: FontWeight.w700)),
                    ]),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: TriSafeColors.muted),
            ]),
          ),
        ),
      );
}

class _StatusIcon extends StatelessWidget {
  final String status;
  const _StatusIcon({required this.status});

  @override
  Widget build(BuildContext context) {
    final resolved = status == 'RESOLVED';
    final dismissed = status == 'DISMISSED';
    final color = resolved
        ? TriSafeColors.forest
        : dismissed
            ? TriSafeColors.muted
            : TriSafeColors.danger;
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
          color: resolved
              ? TriSafeColors.softGreen
              : dismissed
                  ? const Color(0xffecefec)
                  : const Color(0xffffece9),
          borderRadius: BorderRadius.circular(13)),
      child: Icon(
          resolved
              ? Icons.task_alt_rounded
              : dismissed
                  ? Icons.remove_circle_outline_rounded
                  : Icons.gavel_outlined,
          color: color,
          size: 21),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String status;
  const _StatusPill({required this.status});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
            color: status == 'RESOLVED'
                ? TriSafeColors.softGreen
                : status == 'DISMISSED'
                    ? const Color(0xffecefec)
                    : const Color(0xffffece9),
            borderRadius: BorderRadius.circular(99)),
        child: Text(_label(status),
            style: TextStyle(
                color: status == 'RESOLVED'
                    ? TriSafeColors.forest
                    : status == 'DISMISSED'
                        ? TriSafeColors.muted
                        : TriSafeColors.danger,
                fontSize: 8,
                fontWeight: FontWeight.w900)),
      );
}

class _EmptyRecords extends StatelessWidget {
  final bool hasAnyRecords;
  const _EmptyRecords({required this.hasAnyRecords});

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(children: [
            Icon(
                hasAnyRecords
                    ? Icons.filter_alt_off_outlined
                    : Icons.task_alt_rounded,
                size: 42,
                color: TriSafeColors.forest),
            const SizedBox(height: 12),
            Text(
                hasAnyRecords
                    ? 'No matching records'
                    : 'No violations recorded',
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(
                hasAnyRecords
                    ? 'Choose another filter to view a different record status.'
                    : 'Official LGU/BPLO compliance records will appear here if issued.',
                textAlign: TextAlign.center,
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ]),
        ),
      );
}

Future<void> _showDetails(
    BuildContext context, DriverViolationRecord record) async {
  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (context) => SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
            22, 4, 22, 22 + MediaQuery.viewInsetsOf(context).bottom),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('OFFICIAL LGU COMPLIANCE RECORD',
              style: TextStyle(
                  color: TriSafeColors.forest,
                  fontSize: 9,
                  letterSpacing: 1.1,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(record.category,
              style:
                  const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          _StatusPill(status: record.status),
          const Divider(height: 30),
          _DetailRow(
              label: 'Offense level', value: _label(record.offenseLevel)),
          _DetailRow(label: 'Violation date', value: _date(record.occurredAt)),
          _DetailRow(label: 'Case status', value: _label(record.status)),
          _DetailRow(label: 'Penalty', value: _penalty(record)),
          _DetailRow(
              label: 'Penalty status', value: _label(record.penaltyStatus)),
          if (record.dueAt != null)
            _DetailRow(label: 'Penalty due date', value: _date(record.dueAt!)),
          const SizedBox(height: 14),
          const Text('Official description',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(record.description,
              style: const TextStyle(fontSize: 12, height: 1.55)),
          if (record.notes?.trim().isNotEmpty == true) ...[
            const SizedBox(height: 16),
            const Text('LGU notes',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
            const SizedBox(height: 5),
            Text(record.notes!,
                style: const TextStyle(
                    fontSize: 12, height: 1.55, color: TriSafeColors.muted)),
          ],
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
                color: const Color(0xfffff4df),
                borderRadius: BorderRadius.circular(14)),
            child: const Text(
                'For questions about this record or any penalty status, contact the LGU/BPLO transport office. TriSafe does not accept payments.',
                style: TextStyle(
                    fontSize: 10, height: 1.45, color: Color(0xff6f500f))),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close record')),
          ),
        ]),
      ),
    ),
  );
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
              width: 122,
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 10, color: TriSafeColors.muted))),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w800))),
        ]),
      );
}

String _label(String value) => value
    .toLowerCase()
    .split('_')
    .map((part) =>
        part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
    .join(' ');

String _date(DateTime date) =>
    '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';

String _penalty(DriverViolationRecord record) {
  if (record.penaltyAmount == null || record.penaltyAmount == 0) {
    return 'No monetary penalty';
  }
  return '₱${record.penaltyAmount!.toStringAsFixed(2)} · ${_label(record.penaltyStatus)}';
}
