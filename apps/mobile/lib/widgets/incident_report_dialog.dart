import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/passenger_safety_models.dart';
import '../services/trisafe_api.dart';
import '../theme/trisafe_theme.dart';
import 'passenger_toast.dart';

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
  if (rideId != null) {
    PassengerIncident? existing;
    try {
      existing = await api.incidentForRide(rideId);
    } catch (_) {
      if (context.mounted) {
        showPassengerToast(context,
            message:
                'Report history could not be checked. Please try again when you are connected.',
            type: PassengerToastType.error);
      }
      return;
    }
    if (!context.mounted) return;
    if (existing?.status == 'DRAFT') {
      showPassengerToast(context,
          message: 'Your saved draft for this ride is ready to continue.',
          type: PassengerToastType.info);
      await showIncidentDraftEditor(context, api, existing!);
      return;
    }
    if (existing != null) {
      showPassengerToast(context,
          message:
              'This ride already has ${_existingReportPhrase(existing.status)}. Track it in Report history.',
          type: PassengerToastType.info);
      return;
    }
  }

  final input = await _showReportSheet(context, isRideLinked: rideId != null);
  if (input == null || !context.mounted) return;

  _showProgress(context, 'Preparing your report',
      'Organizing the details for your review…');
  Map<String, dynamic> draft;
  try {
    draft = await api.draftIncident(
      input['description'] as String,
      rideId: rideId,
      category: input['category'] as String,
      evidenceData: input['evidenceData'] as String?,
      evidenceName: input['evidenceName'] as String?,
    );
    if (!context.mounted) return;
    Navigator.of(context, rootNavigator: true).pop();
  } catch (_) {
    if (!context.mounted) return;
    Navigator.of(context, rootNavigator: true).pop();
    if (rideId != null) {
      try {
        final existing = await api.incidentForRide(rideId);
        if (!context.mounted) return;
        if (existing?.status == 'DRAFT') {
          showPassengerToast(context,
              message:
                  'This ride already has a draft. Opening it so you can continue.',
              type: PassengerToastType.info);
          await showIncidentDraftEditor(context, api, existing!);
          return;
        }
        if (existing != null) {
          showPassengerToast(context,
              message:
                  'This ride already has ${_existingReportPhrase(existing.status)}. Track it in Report history.',
              type: PassengerToastType.info);
          return;
        }
      } catch (_) {
        // Fall through to the standard save error when recovery cannot load.
      }
    }
    if (!context.mounted) return;
    showPassengerToast(context,
        message: 'The report could not be saved. Please try again.',
        type: PassengerToastType.error);
    return;
  }

  if (!context.mounted) return;
  await _continueDraftWorkflow(
    context,
    api,
    incidentId: draft['id'] as String,
    input: input,
    draft: draft,
    isRideLinked: rideId != null,
  );
}

String _existingReportPhrase(String status) => switch (status) {
      'SUBMITTED' => 'a submitted report',
      'UNDER_REVIEW' => 'a report under LGU review',
      'RESOLVED' => 'a resolved report',
      'DISMISSED' => 'a closed report',
      _ => 'an existing report',
    };

Future<bool> showIncidentDraftEditor(
    BuildContext context, TriSafeApi api, PassengerIncident incident) async {
  if (incident.status != 'DRAFT') return false;
  final categoryTitle = _incidentTypeTitle(incident);
  return _continueDraftWorkflow(
    context,
    api,
    incidentId: incident.id,
    input: {
      'category': incident.category,
      'categoryId': _categoryIdFor(incident.category, categoryTitle),
      'categoryTitle': categoryTitle,
      'description': incident.rawDescription,
      'evidenceName': incident.evidenceName,
      'evidenceChanged': false,
    },
    draft: {
      'aiDraft': incident.aiDraft,
      'missingInformation': const <String>[],
    },
    isRideLinked: incident.rideId != null,
  );
}

Future<Map<String, dynamic>?> _showReportSheet(
  BuildContext context, {
  required bool isRideLinked,
  Map<String, dynamic>? initial,
}) =>
    showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .58),
      sheetAnimationStyle: const AnimationStyle(
        duration: Duration(milliseconds: 220),
        reverseDuration: Duration(milliseconds: 160),
      ),
      builder: (_) => _ReportSheet(
        isRideLinked: isRideLinked,
        initialCategoryId: initial?['categoryId'] as String?,
        initialDescription: initial == null
            ? null
            : _statementOnly(initial['description'] as String,
                initial['categoryTitle'] as String),
        initialEvidenceName: initial?['evidenceName'] as String?,
      ),
    );

Future<bool> _continueDraftWorkflow(
  BuildContext context,
  TriSafeApi api, {
  required String incidentId,
  required Map<String, dynamic> input,
  required Map<String, dynamic> draft,
  required bool isRideLinked,
}) async {
  final category = draft['category']?.toString() ?? input['category'] as String;
  final categoryTitle = input['categoryTitle'] as String;
  final review = await _showReviewSheet(
    context,
    category: category,
    categoryTitle: categoryTitle,
    originalDescription:
        _statementOnly(input['description'] as String, categoryTitle),
    aiDescription: _statementOnly(
        draft['aiDraft'] as String? ?? input['description'] as String,
        categoryTitle),
    missingInformation: ((draft['missingInformation'] as List?) ?? const [])
        .map((item) => item.toString())
        .where((item) => item.trim().isNotEmpty)
        .toList(),
    hasEvidence: input['evidenceName'] != null,
    isRideLinked: isRideLinked,
  );
  if (!context.mounted) return false;
  if (review == null) {
    showPassengerToast(context,
        message: 'Draft saved. Continue editing it from Report history.',
        type: PassengerToastType.success);
    return false;
  }
  if (review.action != _ReviewAction.back) {
    return _finishDraftReview(context, api, incidentId, review);
  }

  final revisedInput = await _showReportSheet(
    context,
    isRideLinked: isRideLinked,
    initial: {
      ...input,
      'description': review.description,
    },
  );
  if (!context.mounted || revisedInput == null) {
    if (context.mounted) {
      showPassengerToast(context,
          message: 'Draft saved. Continue editing it from Report history.',
          type: PassengerToastType.success);
    }
    return false;
  }

  _showProgress(context, 'Updating your draft',
      'Refreshing your report details for the final review…');
  try {
    final evidenceChanged = revisedInput['evidenceChanged'] == true;
    final updated = await api.updateIncidentDraft(
      incidentId,
      description: revisedInput['description'] as String,
      category: revisedInput['category'] as String,
      evidenceData:
          evidenceChanged ? revisedInput['evidenceData'] as String? : null,
      evidenceName:
          evidenceChanged ? revisedInput['evidenceName'] as String? : null,
      removeEvidence: evidenceChanged && revisedInput['evidenceData'] == null,
    );
    if (!context.mounted) return false;
    Navigator.of(context, rootNavigator: true).pop();
    return _continueDraftWorkflow(
      context,
      api,
      incidentId: incidentId,
      input: revisedInput,
      draft: updated,
      isRideLinked: isRideLinked,
    );
  } catch (_) {
    if (!context.mounted) return false;
    Navigator.of(context, rootNavigator: true).pop();
    showPassengerToast(context,
        message: 'Your draft changes could not be saved. Please try again.',
        type: PassengerToastType.error);
    return false;
  }
}

Future<_ReviewResult?> _showReviewSheet(
  BuildContext context, {
  required String category,
  required String categoryTitle,
  required String originalDescription,
  required String aiDescription,
  required List<String> missingInformation,
  required bool hasEvidence,
  required bool isRideLinked,
}) =>
    showModalBottomSheet<_ReviewResult>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .58),
      sheetAnimationStyle: const AnimationStyle(
        duration: Duration(milliseconds: 220),
        reverseDuration: Duration(milliseconds: 160),
      ),
      builder: (_) => _ReviewSheet(
        category: category,
        categoryTitle: categoryTitle,
        originalDescription: originalDescription,
        aiDescription: aiDescription,
        missingInformation: missingInformation,
        hasEvidence: hasEvidence,
        isRideLinked: isRideLinked,
      ),
    );

Future<bool> _finishDraftReview(BuildContext context, TriSafeApi api,
    String incidentId, _ReviewResult review) async {
  final submitting = review.action == _ReviewAction.submit;
  _showProgress(
      context,
      submitting ? 'Submitting securely' : 'Saving your changes',
      submitting
          ? 'Sending your report to the LGU review team…'
          : 'Updating your private incident draft…');
  try {
    if (submitting) {
      await api.submitIncident(incidentId,
          finalDescription: review.description, category: review.category);
    } else {
      await api.updateIncidentDraft(incidentId,
          description: review.description, category: review.category);
    }
    if (!context.mounted) return false;
    Navigator.of(context, rootNavigator: true).pop();
    showPassengerToast(context,
        message: submitting
            ? 'Report submitted. Track its status in Report history.'
            : 'Draft updated. You can continue editing it anytime.',
        type: PassengerToastType.success);
    return true;
  } catch (_) {
    if (!context.mounted) return false;
    Navigator.of(context, rootNavigator: true).pop();
    showPassengerToast(context,
        message: submitting
            ? 'The report could not be submitted. Please try again.'
            : 'The draft could not be updated. Please try again.',
        type: PassengerToastType.error);
    return false;
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
  final String? initialCategoryId;
  final String? initialDescription;
  final String? initialEvidenceName;
  const _ReportSheet({
    required this.isRideLinked,
    this.initialCategoryId,
    this.initialDescription,
    this.initialEvidenceName,
  });

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _description;
  final _descriptionFocus = FocusNode();
  late String _categoryId;
  XFile? _evidence;
  String? _existingEvidenceName;
  bool _evidenceChanged = false;
  bool _preparing = false;

  @override
  void initState() {
    super.initState();
    _description = TextEditingController(text: widget.initialDescription);
    _categoryId = widget.initialCategoryId ?? 'OVERCHARGING';
    _existingEvidenceName = widget.initialEvidenceName;
  }

  @override
  void dispose() {
    _description.dispose();
    _descriptionFocus.dispose();
    super.dispose();
  }

  Future<void> _chooseEvidenceSource() async {
    FocusManager.instance.primaryFocus?.unfocus();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      useSafeArea: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .46),
      sheetAnimationStyle: const AnimationStyle(
        duration: Duration(milliseconds: 180),
        reverseDuration: Duration(milliseconds: 140),
      ),
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
      setState(() {
        _evidence = file;
        _existingEvidenceName = null;
        _evidenceChanged = true;
      });
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
      'categoryId': selected.id,
      'categoryTitle': selected.title,
      'evidenceData': data,
      'evidenceName': _evidence?.name ?? _existingEvidenceName,
      'evidenceChanged': _evidenceChanged,
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
                  fileName: _evidence?.name ?? _existingEvidenceName,
                  onAdd: _chooseEvidenceSource,
                  onRemove: () => setState(() {
                    _evidence = null;
                    _existingEvidenceName = null;
                    _evidenceChanged = true;
                  }),
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
  final String originalDescription;
  final String aiDescription;
  final List<String> missingInformation;
  final bool hasEvidence;
  final bool isRideLinked;
  const _ReviewSheet({
    required this.category,
    required this.categoryTitle,
    required this.originalDescription,
    required this.aiDescription,
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
  bool _aiApplied = false;

  @override
  void initState() {
    super.initState();
    _description = TextEditingController(text: widget.originalDescription);
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  void _applyAi() {
    setState(() {
      _description.text = widget.aiDescription;
      _description.selection =
          TextSelection.collapsed(offset: _description.text.length);
      _aiApplied = true;
    });
  }

  void _restoreOriginal() {
    setState(() {
      _description.text = widget.originalDescription;
      _description.selection =
          TextSelection.collapsed(offset: _description.text.length);
      _aiApplied = false;
    });
  }

  void _finish(_ReviewAction action) {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.pop(
        context,
        _ReviewResult(
            category: widget.category,
            description:
                _composeStatement(widget.categoryTitle, _description.text),
            action: action));
  }

  void _backToDetails() {
    FocusManager.instance.primaryFocus?.unfocus();
    Navigator.pop(
        context,
        _ReviewResult(
            category: widget.category,
            description:
                _composeStatement(widget.categoryTitle, _description.text),
            action: _ReviewAction.back));
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
          onBack: _backToDetails,
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
              _AiAssistanceCard(
                applied: _aiApplied,
                onApply: _applyAi,
                onRestore: _restoreOriginal,
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
          primaryLabel: 'Submit Report',
          primaryIcon: Icons.send_rounded,
          onPrimary: () => _finish(_ReviewAction.submit),
          secondaryLabel: 'Save draft',
          onSecondary: () => _finish(_ReviewAction.save),
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
  Widget build(BuildContext context) => FractionallySizedBox(
        heightFactor: heightFactor,
        child: Material(
          color: const Color(0xfff7f8f5),
          clipBehavior: Clip.antiAlias,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
          child: Column(children: [
            RepaintBoundary(child: header),
            Expanded(child: body),
            RepaintBoundary(child: footer),
            const _KeyboardInset(),
          ]),
        ),
      );
}

class _KeyboardInset extends StatelessWidget {
  const _KeyboardInset();

  @override
  Widget build(BuildContext context) =>
      SizedBox(height: MediaQuery.viewInsetsOf(context).bottom);
}

class _Header extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String subtitle;
  final String step;
  final VoidCallback? onBack;
  final VoidCallback onClose;
  const _Header(
      {required this.eyebrow,
      required this.title,
      required this.subtitle,
      required this.step,
      this.onBack,
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
            if (onBack != null)
              Semantics(
                button: true,
                label: 'Back to report details',
                child: IconButton.filledTonal(
                  onPressed: onBack,
                  tooltip: 'Back to report details',
                  icon: const Icon(Icons.arrow_back_rounded, size: 23),
                  style: IconButton.styleFrom(
                    minimumSize: const Size.square(48),
                    backgroundColor: Colors.white,
                    foregroundColor: TriSafeColors.deepGreen,
                    side: const BorderSide(color: TriSafeColors.line),
                  ),
                ),
              )
            else
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
            child: Container(
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
  final String? fileName;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  const _EvidenceCard(
      {required this.fileName, required this.onAdd, required this.onRemove});

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: fileName == null ? onAdd : null,
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
                    fileName == null
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
                      Text(fileName == null ? 'Add a photo' : 'Photo attached',
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: TriSafeColors.black)),
                      const SizedBox(height: 3),
                      Text(
                          fileName == null
                              ? 'Take a photo or choose from your gallery'
                              : fileName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 11, color: TriSafeColors.muted)),
                    ]),
              ),
              if (fileName == null)
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
            height: 116,
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

class _AiAssistanceCard extends StatelessWidget {
  final bool applied;
  final VoidCallback onApply;
  final VoidCallback onRestore;

  const _AiAssistanceCard({
    required this.applied,
    required this.onApply,
    required this.onRestore,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xffedf8eb), Color(0xfff8fbf5)],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xffcfe5c8)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: TriSafeColors.deepGreen,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.auto_awesome_rounded,
                      color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('AI writing assistance',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: TriSafeColors.black)),
                      SizedBox(height: 3),
                      Text(
                        'Improve clarity, grammar, and completeness while keeping your report factual.',
                        style: TextStyle(
                            fontSize: 11,
                            height: 1.4,
                            color: TriSafeColors.muted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: applied
                  ? OutlinedButton.icon(
                      onPressed: onRestore,
                      icon: const Icon(Icons.undo_rounded, size: 18),
                      label: const Text('Restore my original'),
                    )
                  : FilledButton.icon(
                      onPressed: onApply,
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: TriSafeColors.deepGreen,
                        side: const BorderSide(color: Color(0xffb8d8af)),
                      ),
                      icon: const Icon(Icons.auto_fix_high_rounded, size: 18),
                      label: const Text('Enhance with AI'),
                    ),
            ),
            const SizedBox(height: 9),
            Row(
              children: [
                Icon(
                  applied
                      ? Icons.check_circle_outline_rounded
                      : Icons.info_outline_rounded,
                  size: 16,
                  color: applied ? TriSafeColors.forest : TriSafeColors.muted,
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: Text(
                    applied
                        ? 'AI enhancement applied. Review and edit the result before submitting.'
                        : 'Optional. Your original statement stays unchanged until you choose this.',
                    style: TextStyle(
                      fontSize: 10,
                      height: 1.35,
                      color: applied
                          ? TriSafeColors.deepGreen
                          : TriSafeColors.muted,
                    ),
                  ),
                ),
              ],
            ),
          ],
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
  final _ReviewAction action;
  const _ReviewResult(
      {required this.category,
      required this.description,
      required this.action});
}

enum _ReviewAction { back, save, submit }

String _categoryIdFor(String backendValue, String categoryTitle) {
  for (final item in _categories) {
    if (item.backendValue == backendValue && item.title == categoryTitle) {
      return item.id;
    }
  }
  return _categories
      .firstWhere((item) => item.backendValue == backendValue,
          orElse: () => _categories.last)
      .id;
}

String _incidentTypeTitle(PassengerIncident incident) {
  final match = RegExp(r'^Incident type:\s*([^\r\n]+)', caseSensitive: false)
      .firstMatch(incident.rawDescription.trim());
  if (match != null && match.group(1)?.trim().isNotEmpty == true) {
    return match.group(1)!.trim();
  }
  for (final item in _categories) {
    if (item.backendValue == incident.category) return item.title;
  }
  return incident.category;
}

String _statementOnly(String value, String categoryTitle) {
  var clean = value.trim();
  clean = clean.replaceFirst(
      RegExp(r'^Incident summary:\s*', caseSensitive: false), '');
  clean = clean.replaceFirst(
      RegExp('^Incident type:\\s*${RegExp.escape(categoryTitle)}[.:]?\\s*',
          caseSensitive: false),
      '');
  return clean.trim();
}

String _composeStatement(String categoryTitle, String statement) =>
    'Incident type: $categoryTitle\n\n${statement.trim()}';
