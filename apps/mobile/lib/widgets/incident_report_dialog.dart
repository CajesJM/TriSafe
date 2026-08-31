import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/trisafe_api.dart';
import '../theme/trisafe_theme.dart';

const _categories = [
  _Category(
      'OVERCHARGING',
      'OVERCHARGING',
      'Overcharging / Fare Issue',
      'Incorrect or excessive fare',
      Icons.payments_outlined,
      Color(0xffd58a00)),
  _Category(
      'UNSAFE_DRIVING',
      'SAFETY',
      'Reckless / Unsafe Driving',
      'Dangerous or reckless driving',
      Icons.car_crash_outlined,
      Color(0xffc53737)),
  _Category(
      'DRIVER_CONDUCT',
      'HARASSMENT',
      'Driver Behavior / Conduct',
      'Behavior, harassment, or conflict',
      Icons.person_off_outlined,
      Color(0xff6f4a94)),
  _Category(
      'OVERLOADING',
      'SAFETY',
      'Overloading / Passenger Capacity',
      'Too many passengers or unsafe load',
      Icons.groups_outlined,
      Color(0xffdf6c20)),
  _Category(
      'VEHICLE_SAFETY',
      'VEHICLE',
      'Vehicle / Safety Issue',
      'Condition or safety equipment',
      Icons.health_and_safety_outlined,
      Color(0xff278047)),
  _Category(
      'ROUTE_SERVICE',
      'OTHER',
      'Route / Service Issue',
      'Route refusal, detour, or service issue',
      Icons.route_outlined,
      Color(0xff276ca8)),
  _Category('OTHER', 'OTHER', 'Other (Please explain)', 'Any other concern',
      Icons.more_horiz_rounded, Color(0xff66706a)),
];

Future<void> showIncidentReport(BuildContext context, TriSafeApi api,
    {String? rideId}) async {
  final input = await showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: .58),
    builder: (_) => _ReportSheet(isRideLinked: rideId != null),
  );
  if (input == null || !context.mounted) return;

  _showProgress(context, 'Preparing your report',
      'Organizing the details for your review…');
  var progressOpen = true;
  try {
    final draft = await api.draftIncident(
      input['description'] as String,
      rideId: rideId,
      category: input['category'] as String,
      evidenceData: input['evidenceData'] as String?,
      evidenceName: input['evidenceName'] as String?,
    );
    if (!context.mounted) return;
    Navigator.of(context, rootNavigator: true).pop();
    progressOpen = false;

    final review = await showModalBottomSheet<_ReviewResult>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .58),
      builder: (_) => _ReviewSheet(
        category: draft['category']?.toString() ?? input['category'] as String,
        categoryTitle: input['categoryTitle'] as String,
        description:
            draft['aiDraft'] as String? ?? input['description'] as String,
        missingInformation: ((draft['missingInformation'] as List?) ?? const [])
            .map((item) => item.toString())
            .where((item) => item.trim().isNotEmpty)
            .toList(),
        hasEvidence: input['evidenceData'] != null,
        isRideLinked: rideId != null,
      ),
    );
    if (review == null || !context.mounted) return;

    _showProgress(context, 'Submitting securely',
        'Sending your report to the LGU review team…');
    progressOpen = true;
    await api.submitIncident(draft['id'] as String,
        finalDescription: review.description, category: review.category);
    if (!context.mounted) return;
    Navigator.of(context, rootNavigator: true).pop();
    progressOpen = false;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Report submitted. Track its status in Report history.'),
      backgroundColor: TriSafeColors.forest,
      behavior: SnackBarBehavior.floating,
    ));
  } catch (error) {
    if (!context.mounted) return;
    if (progressOpen) Navigator.of(context, rootNavigator: true).pop();
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('The report could not be saved. Please try again.'),
      behavior: SnackBarBehavior.floating,
    ));
  }
}

void _showProgress(BuildContext context, String title, String message) {
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => PopScope(
      canPop: false,
      child: Dialog(
        elevation: 0,
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Row(children: [
            const SizedBox.square(
                dimension: 30,
                child: CircularProgressIndicator(strokeWidth: 3)),
            const SizedBox(width: 18),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: TriSafeColors.black)),
                  const SizedBox(height: 4),
                  Text(message,
                      style: const TextStyle(
                          fontSize: 12,
                          height: 1.35,
                          color: TriSafeColors.muted)),
                ],
              ),
            ),
          ]),
        ),
      ),
    ),
  );
}

class _ReportSheet extends StatefulWidget {
  final bool isRideLinked;
  const _ReportSheet({required this.isRideLinked});

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _descriptionFocus = FocusNode();
  String _categoryId = 'OVERCHARGING';
  XFile? _evidence;
  bool _preparing = false;

  @override
  void dispose() {
    _description.dispose();
    _descriptionFocus.dispose();
    super.dispose();
  }

  Future<void> _chooseEvidenceSource() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .46),
      builder: (sheetContext) => _PhotoSourceSheet(
        onCamera: () => Navigator.pop(sheetContext, ImageSource.camera),
        onGallery: () => Navigator.pop(sheetContext, ImageSource.gallery),
      ),
    );
    if (source != null && mounted) await _pickEvidence(source);
  }

  Future<void> _pickEvidence(ImageSource source) async {
    try {
      final file = await ImagePicker()
          .pickImage(source: source, imageQuality: 82, maxWidth: 1600);
      if (file == null || !mounted) return;
      if (await file.length() > 2 * 1024 * 1024) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Choose a JPG or PNG smaller than 2 MB.'),
            behavior: SnackBarBehavior.floating));
        return;
      }
      setState(() => _evidence = file);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              'TriSafe could not open that photo source. Check the app permission and try again.'),
          behavior: SnackBarBehavior.floating));
    }
  }

  Future<void> _continue() async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) {
      _descriptionFocus.requestFocus();
      return;
    }
    setState(() => _preparing = true);
    final selected = _categories.firstWhere((item) => item.id == _categoryId);
    String? data;
    if (_evidence != null) {
      final type =
          _evidence!.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      data =
          'data:image/$type;base64,${base64Encode(await _evidence!.readAsBytes())}';
    }
    if (!mounted) return;
    Navigator.pop(context, {
      'description':
          'Incident type: ${selected.title}\n\n${_description.text.trim()}',
      'category': selected.backendValue,
      'categoryTitle': selected.title,
      'evidenceData': data,
      'evidenceName': _evidence?.name,
    });
  }

  @override
  Widget build(BuildContext context) => _SheetFrame(
        heightFactor: .96,
        header: _Header(
          eyebrow: 'SAFETY REPORT',
          title: 'Report an incident',
          subtitle:
              'Tell us what happened. Your report will be reviewed by the LGU.',
          step: 'STEP 1 OF 2',
          onClose: () => Navigator.pop(context),
        ),
        body: Form(
          key: _formKey,
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.isRideLinked) ...[
                  const _RideLinkedBanner(),
                  const SizedBox(height: 22),
                ],
                const _SectionTitle('01', 'What happened?',
                    'Choose the category that fits best.'),
                const SizedBox(height: 12),
                LayoutBuilder(builder: (context, constraints) {
                  final half = (constraints.maxWidth - 10) / 2;
                  return Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: _categories.map((item) {
                      return SizedBox(
                        width: item == _categories.last
                            ? constraints.maxWidth
                            : half,
                        child: _CategoryTile(
                          item: item,
                          selected: _categoryId == item.id,
                          onTap: () => setState(() => _categoryId = item.id),
                        ),
                      );
                    }).toList(),
                  );
                }),
                const SizedBox(height: 26),
                const _SectionTitle('02', 'Describe the incident',
                    'Include what happened, where, and when.'),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _description,
                  focusNode: _descriptionFocus,
                  minLines: 5,
                  maxLines: 8,
                  maxLength: 2000,
                  textCapitalization: TextCapitalization.sentences,
                  validator: (value) => (value ?? '').trim().length < 10
                      ? 'Add a few more details so the LGU can review this report.'
                      : null,
                  decoration: _textDecoration(
                      'Example: The driver charged a higher fare than the amount shown in TriSafe…'),
                ),
                const SizedBox(height: 18),
                const _SectionTitle('03', 'Add supporting evidence',
                    'Optional · one JPG or PNG · up to 2 MB'),
                const SizedBox(height: 12),
                _EvidenceCard(
                  file: _evidence,
                  onAdd: _chooseEvidenceSource,
                  onRemove: () => setState(() => _evidence = null),
                ),
                const SizedBox(height: 14),
                const _InfoNote(
                  icon: Icons.lock_outline_rounded,
                  text:
                      'Only include information related to this incident. Your report is shared with authorized LGU reviewers.',
                ),
              ],
            ),
          ),
        ),
        footer: _Footer(
          primaryLabel: 'Review report',
          primaryIcon: Icons.arrow_forward_rounded,
          loading: _preparing,
          onPrimary: _continue,
          secondaryLabel: 'Cancel',
          onSecondary: () => Navigator.pop(context),
        ),
      );
}

class _ReviewSheet extends StatefulWidget {
  final String category;
  final String categoryTitle;
  final String description;
  final List<String> missingInformation;
  final bool hasEvidence;
  final bool isRideLinked;
  const _ReviewSheet({
    required this.category,
    required this.categoryTitle,
    required this.description,
    required this.missingInformation,
    required this.hasEvidence,
    required this.isRideLinked,
  });

  @override
  State<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<_ReviewSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _description;

  @override
  void initState() {
    super.initState();
    _description = TextEditingController(text: widget.description);
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.pop(
        context,
        _ReviewResult(
            category: widget.category, description: _description.text.trim()));
  }

  @override
  Widget build(BuildContext context) => _SheetFrame(
        heightFactor: .92,
        header: _Header(
          eyebrow: 'FINAL CHECK',
          title: 'Review your report',
          subtitle:
              'Make sure every detail is correct before sending it to the LGU.',
          step: 'STEP 2 OF 2',
          onClose: () => Navigator.pop(context),
        ),
        body: Form(
          key: _formKey,
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 30),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: _cardDecoration(),
                child: Column(children: [
                  _ReviewRow(Icons.category_outlined, 'Category',
                      widget.categoryTitle),
                  const Divider(height: 24),
                  _ReviewRow(
                      Icons.link_rounded,
                      'Ride record',
                      widget.isRideLinked
                          ? 'Verified ride linked'
                          : 'General incident'),
                  const Divider(height: 24),
                  _ReviewRow(
                      Icons.image_outlined,
                      'Evidence',
                      widget.hasEvidence
                          ? '1 photo attached'
                          : 'No photo attached'),
                ]),
              ),
              const SizedBox(height: 22),
              const _SectionTitle('01', 'Your statement',
                  'You can make final changes before submitting.'),
              const SizedBox(height: 12),
              TextFormField(
                controller: _description,
                minLines: 7,
                maxLines: 11,
                maxLength: 4000,
                textCapitalization: TextCapitalization.sentences,
                validator: (value) => (value ?? '').trim().length < 10
                    ? 'Your report needs at least 10 characters.'
                    : null,
                decoration: _textDecoration(null),
              ),
              if (widget.missingInformation.isNotEmpty) ...[
                const SizedBox(height: 12),
                _InfoNote(
                  icon: Icons.tips_and_updates_outlined,
                  text:
                      'If known, you may add: ${widget.missingInformation.join(', ')}.',
                  amber: true,
                ),
              ],
              const SizedBox(height: 14),
              const _InfoNote(
                icon: Icons.admin_panel_settings_outlined,
                text:
                    'TriSafe may help organize your statement. Every decision and follow-up action is made by an authorized LGU reviewer.',
              ),
            ]),
          ),
        ),
        footer: _Footer(
          primaryLabel: 'Submit to LGU',
          primaryIcon: Icons.send_rounded,
          onPrimary: _submit,
          secondaryLabel: 'Keep draft',
          onSecondary: () => Navigator.pop(context),
        ),
      );
}

class _SheetFrame extends StatelessWidget {
  final double heightFactor;
  final Widget header;
  final Widget body;
  final Widget footer;
  const _SheetFrame(
      {required this.heightFactor,
      required this.header,
      required this.body,
      required this.footer});

  @override
  Widget build(BuildContext context) => AnimatedPadding(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        padding:
            EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: FractionallySizedBox(
          heightFactor: heightFactor,
          child: Material(
            color: const Color(0xfff7f8f5),
            clipBehavior: Clip.antiAlias,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
            child: Column(children: [header, Expanded(child: body), footer]),
          ),
        ),
      );
}

class _Header extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String subtitle;
  final String step;
  final VoidCallback onClose;
  const _Header(
      {required this.eyebrow,
      required this.title,
      required this.subtitle,
      required this.step,
      required this.onClose});

  @override
  Widget build(BuildContext context) => Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xfffff2f0), Color(0xfff1f7ed)]),
          border: Border(bottom: BorderSide(color: Color(0xffe3e8df))),
        ),
        padding: const EdgeInsets.fromLTRB(20, 10, 16, 20),
        child: Column(children: [
          Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                  color: const Color(0xffc7cec4),
                  borderRadius: BorderRadius.circular(99))),
          const SizedBox(height: 12),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: TriSafeColors.danger,
                borderRadius: BorderRadius.circular(15),
                boxShadow: [
                  BoxShadow(
                      color: TriSafeColors.danger.withValues(alpha: .18),
                      blurRadius: 18,
                      offset: const Offset(0, 7))
                ],
              ),
              child: const Icon(Icons.shield_outlined,
                  color: Colors.white, size: 25),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Text(eyebrow,
                          style: const TextStyle(
                              fontSize: 10,
                              letterSpacing: 1.4,
                              fontWeight: FontWeight.w900,
                              color: TriSafeColors.danger)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 9, vertical: 5),
                        decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: .82),
                            borderRadius: BorderRadius.circular(99),
                            border: Border.all(color: TriSafeColors.line)),
                        child: Text(step,
                            style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                color: TriSafeColors.muted)),
                      ),
                    ]),
                    const SizedBox(height: 6),
                    Text(title,
                        style: const TextStyle(
                            fontSize: 23,
                            height: 1.05,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -.4,
                            color: TriSafeColors.black)),
                    const SizedBox(height: 7),
                    Text(subtitle,
                        style: const TextStyle(
                            fontSize: 12,
                            height: 1.4,
                            color: TriSafeColors.muted)),
                  ]),
            ),
            const SizedBox(width: 6),
            Semantics(
              button: true,
              label: 'Close report',
              child: IconButton.filledTonal(
                onPressed: onClose,
                icon: const Icon(Icons.close_rounded, size: 21),
                style: IconButton.styleFrom(
                    minimumSize: const Size.square(44),
                    backgroundColor: Colors.white.withValues(alpha: .84),
                    foregroundColor: TriSafeColors.charcoal),
              ),
            ),
          ]),
        ]),
      );
}

class _RideLinkedBanner extends StatelessWidget {
  const _RideLinkedBanner();
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
            color: const Color(0xffedf7ed),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xffcfe5cc))),
        child: const Row(children: [
          Icon(Icons.verified_user_outlined,
              size: 21, color: TriSafeColors.forest),
          SizedBox(width: 11),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Verified ride linked',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: TriSafeColors.deepGreen)),
              SizedBox(height: 2),
              Text('The ride, driver, and vehicle are attached automatically.',
                  style: TextStyle(
                      fontSize: 11, height: 1.35, color: TriSafeColors.muted)),
            ]),
          ),
        ]),
      );
}

class _SectionTitle extends StatelessWidget {
  final String number;
  final String title;
  final String helper;
  const _SectionTitle(this.number, this.title, this.helper);

  @override
  Widget build(BuildContext context) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 30,
          height: 30,
          alignment: Alignment.center,
          decoration: BoxDecoration(
              color: TriSafeColors.deepGreen,
              borderRadius: BorderRadius.circular(10)),
          child: Text(number,
              style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: Colors.white)),
        ),
        const SizedBox(width: 11),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: TriSafeColors.black)),
            const SizedBox(height: 2),
            Text(helper,
                style: const TextStyle(
                    fontSize: 11, height: 1.3, color: TriSafeColors.muted)),
          ]),
        ),
      ]);
}

class _CategoryTile extends StatelessWidget {
  final _Category item;
  final bool selected;
  final VoidCallback onTap;
  const _CategoryTile(
      {required this.item, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        label: '${item.title}. ${item.description}',
        child: Material(
          color: selected ? item.accent.withValues(alpha: .09) : Colors.white,
          borderRadius: BorderRadius.circular(17),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(17),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              constraints: const BoxConstraints(minHeight: 82),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(17),
                  border: Border.all(
                      color: selected ? item.accent : TriSafeColors.line,
                      width: selected ? 1.5 : 1)),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                      color: selected
                          ? item.accent
                          : item.accent.withValues(alpha: .09),
                      borderRadius: BorderRadius.circular(11)),
                  child: Icon(item.icon,
                      size: 18, color: selected ? Colors.white : item.accent),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.title,
                            style: const TextStyle(
                                fontSize: 12,
                                height: 1.2,
                                fontWeight: FontWeight.w900,
                                color: TriSafeColors.black)),
                        const SizedBox(height: 4),
                        Text(item.description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 9.5,
                                height: 1.25,
                                color: TriSafeColors.muted)),
                      ]),
                ),
                if (selected)
                  Icon(Icons.check_circle_rounded,
                      size: 18, color: item.accent),
              ]),
            ),
          ),
        ),
      );
}

class _EvidenceCard extends StatelessWidget {
  final XFile? file;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  const _EvidenceCard(
      {required this.file, required this.onAdd, required this.onRemove});

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: file == null ? onAdd : null,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            constraints: const BoxConstraints(minHeight: 78),
            padding: const EdgeInsets.all(14),
            decoration: _cardDecoration(),
            child: Row(children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                    color: const Color(0xffeef4ec),
                    borderRadius: BorderRadius.circular(14)),
                child: Icon(
                    file == null
                        ? Icons.add_photo_alternate_outlined
                        : Icons.image_outlined,
                    color: TriSafeColors.forest,
                    size: 23),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(file == null ? 'Add a photo' : 'Photo attached',
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: TriSafeColors.black)),
                      const SizedBox(height: 3),
                      Text(
                          file == null
                              ? 'Take a photo or choose from your gallery'
                              : file!.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 11, color: TriSafeColors.muted)),
                    ]),
              ),
              if (file == null)
                const Icon(Icons.chevron_right_rounded,
                    color: TriSafeColors.muted)
              else
                IconButton(
                    onPressed: onRemove,
                    tooltip: 'Remove evidence',
                    icon: const Icon(Icons.delete_outline_rounded),
                    color: TriSafeColors.danger),
            ]),
          ),
        ),
      );
}

class _PhotoSourceSheet extends StatelessWidget {
  final VoidCallback onCamera;
  final VoidCallback onGallery;

  const _PhotoSourceSheet({
    required this.onCamera,
    required this.onGallery,
  });

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        clipBehavior: Clip.antiAlias,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Align(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xffc7cec4),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Add supporting photo',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w900,
                    color: TriSafeColors.black,
                  ),
                ),
                const SizedBox(height: 5),
                const Text(
                  'Choose where you want to get the evidence photo.',
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.4,
                    color: TriSafeColors.muted,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: _PhotoSourceAction(
                        icon: Icons.photo_camera_outlined,
                        title: 'Take photo',
                        subtitle: 'Open camera',
                        onTap: onCamera,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _PhotoSourceAction(
                        icon: Icons.photo_library_outlined,
                        title: 'Gallery',
                        subtitle: 'Choose from phone',
                        onTap: onGallery,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Row(
                  children: [
                    Icon(Icons.info_outline_rounded,
                        size: 17, color: TriSafeColors.muted),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Use a clear JPG or PNG image smaller than 2 MB.',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: TriSafeColors.muted,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
}

class _PhotoSourceAction extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _PhotoSourceAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Material(
        color: const Color(0xfff5f8f3),
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            constraints: const BoxConstraints(minHeight: 116),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: TriSafeColors.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: TriSafeColors.deepGreen,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(icon, size: 21, color: Colors.white),
                ),
                const Spacer(),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: TriSafeColors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: TriSafeColors.muted,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _InfoNote extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool amber;
  const _InfoNote({required this.icon, required this.text, this.amber = false});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: amber ? const Color(0xfffff8e8) : const Color(0xffedf5ea),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
              color: amber ? const Color(0xffffe0a3) : const Color(0xffd5e7d0)),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon,
              size: 20,
              color: amber ? const Color(0xff8a5a00) : TriSafeColors.forest),
          const SizedBox(width: 9),
          Expanded(
              child: Text(text,
                  style: TextStyle(
                      fontSize: 10.5,
                      height: 1.4,
                      color: amber
                          ? const Color(0xff6f4d0b)
                          : TriSafeColors.deepGreen))),
        ]),
      );
}

class _ReviewRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _ReviewRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Row(children: [
        Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
                color: const Color(0xffeef5ec),
                borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 19, color: TriSafeColors.forest)),
        const SizedBox(width: 11),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label,
                style:
                    const TextStyle(fontSize: 10, color: TriSafeColors.muted)),
            const SizedBox(height: 2),
            Text(value,
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: TriSafeColors.black)),
          ]),
        ),
      ]);
}

class _Footer extends StatelessWidget {
  final String primaryLabel;
  final IconData primaryIcon;
  final VoidCallback onPrimary;
  final String secondaryLabel;
  final VoidCallback onSecondary;
  final bool loading;
  const _Footer(
      {required this.primaryLabel,
      required this.primaryIcon,
      required this.onPrimary,
      required this.secondaryLabel,
      required this.onSecondary,
      this.loading = false});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: TriSafeColors.line))),
        child: SafeArea(
          top: false,
          child: Row(children: [
            SizedBox(
                height: 50,
                child: TextButton(
                    onPressed: loading ? null : onSecondary,
                    child: Text(secondaryLabel))),
            const SizedBox(width: 12),
            Expanded(
              child: SizedBox(
                height: 52,
                child: FilledButton(
                  onPressed: loading ? null : onPrimary,
                  style: FilledButton.styleFrom(
                      backgroundColor: TriSafeColors.deepGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16))),
                  child: loading
                      ? const SizedBox.square(
                          dimension: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.5, color: Colors.white))
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                              Text(primaryLabel,
                                  style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w900)),
                              const SizedBox(width: 8),
                              Icon(primaryIcon, size: 19),
                            ]),
                ),
              ),
            ),
          ]),
        ),
      );
}

InputDecoration _textDecoration(String? hint) => InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
          fontSize: 13,
          height: 1.45,
          color: TriSafeColors.muted.withValues(alpha: .78)),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.all(16),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: TriSafeColors.line)),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: TriSafeColors.line)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide:
              const BorderSide(color: TriSafeColors.deepGreen, width: 1.5)),
      errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: TriSafeColors.danger)),
    );

BoxDecoration _cardDecoration() => BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: TriSafeColors.line),
    );

class _Category {
  final String id;
  final String backendValue;
  final String title;
  final String description;
  final IconData icon;
  final Color accent;
  const _Category(this.id, this.backendValue, this.title, this.description,
      this.icon, this.accent);
}

class _ReviewResult {
  final String category;
  final String description;
  const _ReviewResult({required this.category, required this.description});
}
