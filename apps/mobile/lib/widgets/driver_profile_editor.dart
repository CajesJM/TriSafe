import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../models/driver_models.dart';
import '../models/driver_profile_update_models.dart';
import '../services/trisafe_api.dart';
import '../theme/trisafe_theme.dart';
import 'driver_avatar.dart';

Future<bool> showDriverProfileEditor(
  BuildContext context,
  TriSafeApi api,
  DriverProfile profile,
) async =>
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DriverProfileEditor(api: api, profile: profile),
    ) ??
    false;

class _DriverProfileEditor extends StatefulWidget {
  final TriSafeApi api;
  final DriverProfile profile;

  const _DriverProfileEditor({required this.api, required this.profile});

  @override
  State<_DriverProfileEditor> createState() => _DriverProfileEditorState();
}

class _DriverProfileEditorState extends State<_DriverProfileEditor> {
  static const _twoMegabytes = 2 * 1024 * 1024;
  final _formKey = GlobalKey<FormState>();
  final _picker = ImagePicker();
  late final TextEditingController _phoneController;
  late final TextEditingController _purokController;
  final _municipalityController = TextEditingController();
  final _barangayController = TextEditingController();

  List<DriverLocationOption> _municipalities = [];
  List<DriverLocationOption> _barangays = [];
  DriverLocationOption? _municipality;
  DriverLocationOption? _barangay;
  String? _draftAvatar;
  bool _avatarChanged = false;
  bool _loadingLocations = true;
  bool _saving = false;
  String? _locationError;
  String? _serverError;

  @override
  void initState() {
    super.initState();
    final phoneDigits = widget.profile.phone.replaceAll(RegExp(r'\D'), '');
    _phoneController = TextEditingController(
        text: phoneDigits.startsWith('63')
            ? phoneDigits.substring(2)
            : phoneDigits);
    _purokController =
        TextEditingController(text: widget.profile.address?.purok ?? '');
    _draftAvatar = widget.profile.avatarData;
    _loadMunicipalities();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _purokController.dispose();
    _municipalityController.dispose();
    _barangayController.dispose();
    super.dispose();
  }

  Future<void> _loadMunicipalities() async {
    try {
      final municipalities = await widget.api.driverMunicipalities();
      if (!mounted) return;
      final currentAddress = widget.profile.address;
      final selected = currentAddress == null
          ? null
          : municipalities
              .where((item) => item.code == currentAddress.municipalityCode)
              .firstOrNull;
      setState(() {
        _municipalities = municipalities;
        _municipality = selected;
        _municipalityController.text = selected?.name ?? '';
      });
      if (selected != null) {
        await _loadBarangays(selected.code, restoreCurrent: true);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _locationError =
          'The Bohol location directory could not be loaded. Check your connection and try again.');
    } finally {
      if (mounted) setState(() => _loadingLocations = false);
    }
  }

  Future<void> _loadBarangays(String municipalityCode,
      {bool restoreCurrent = false}) async {
    setState(() {
      _barangays = [];
      if (!restoreCurrent) {
        _barangay = null;
        _barangayController.clear();
      }
    });
    try {
      final barangays = await widget.api.driverBarangays(municipalityCode);
      if (!mounted) return;
      final currentAddress = widget.profile.address;
      final selected = restoreCurrent && currentAddress != null
          ? barangays
              .where((item) => item.code == currentAddress.barangayCode)
              .firstOrNull
          : null;
      setState(() {
        _barangays = barangays;
        if (restoreCurrent) {
          _barangay = selected;
          _barangayController.text = selected?.name ?? '';
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _locationError =
          'Barangays could not be loaded for the selected municipality. Please try again.');
    }
  }

  Future<void> _selectPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 4, 18, 22),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Update profile photo',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            const Text(
                'Choose a clear photo of the registered driver. Maximum size: 2 MB.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: TriSafeColors.muted)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from device'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ]),
        ),
      ),
    );
    if (source == null || !mounted) return;

    try {
      final file = await _picker.pickImage(
        source: source,
        imageQuality: 82,
        maxWidth: 1440,
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (bytes.length > _twoMegabytes) {
        setState(() => _serverError =
            'This image is larger than 2 MB. Choose a smaller image and try again.');
        return;
      }
      final mimeType = _imageMimeType(file.name);
      setState(() {
        _draftAvatar = 'data:$mimeType;base64,${base64Encode(bytes)}';
        _avatarChanged = true;
        _serverError = null;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _serverError =
            'The selected image could not be read. Please choose another JPG, PNG, or WebP image.');
      }
    }
  }

  void _removePhoto() => setState(() {
        _draftAvatar = null;
        _avatarChanged = true;
      });

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_municipality == null || _barangay == null) {
      setState(() => _locationError =
          'Select both your Municipality/City and Barangay before saving.');
      return;
    }
    final address = DriverAddressUpdate(
      provinceCode: '0701200000',
      provinceName: 'Bohol',
      municipalityCode: _municipality!.code,
      municipalityName: _municipality!.name,
      barangayCode: _barangay!.code,
      barangayName: _barangay!.name,
      purok: _purokController.text.trim(),
    );
    final currentAddress = widget.profile.address;
    final addressChanged = currentAddress == null ||
        currentAddress.municipalityCode != address.municipalityCode ||
        currentAddress.barangayCode != address.barangayCode ||
        currentAddress.purok != address.purok;
    final phone = '+63${_phoneController.text}';
    final phoneChanged = phone != widget.profile.phone;
    if (!phoneChanged && !addressChanged && !_avatarChanged) {
      Navigator.pop(context, false);
      return;
    }

    setState(() {
      _saving = true;
      _serverError = null;
    });
    try {
      await widget.api.updateDriverProfile(
        phone: phoneChanged ? phone : null,
        updateAvatar: _avatarChanged,
        avatarData: _draftAvatar,
        address: addressChanged ? address : null,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(() {
          _saving = false;
          _serverError = _friendlyProfileError(error);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Container(
        constraints:
            BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .94),
        decoration: const BoxDecoration(
          color: TriSafeColors.offWhite,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(children: [
          const SizedBox(height: 12),
          Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                  color: TriSafeColors.line,
                  borderRadius: BorderRadius.circular(99))),
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                  20, 20, 20, 24 + MediaQuery.viewInsetsOf(context).bottom),
              child: Form(
                key: _formKey,
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('EDIT DRIVER PROFILE',
                          style: TextStyle(
                              color: TriSafeColors.forest,
                              fontSize: 10,
                              letterSpacing: 1.1,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 6),
                      const Text('Keep your contact details current',
                          style: TextStyle(
                              fontSize: 22, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 6),
                      const Text(
                          'You can update your private photo, mobile number, and present Bohol address. LGU records stay protected.',
                          style: TextStyle(
                              fontSize: 11,
                              height: 1.45,
                              color: TriSafeColors.muted)),
                      const SizedBox(height: 22),
                      Center(
                        child: Column(children: [
                          DriverAvatar(
                              fullName: widget.profile.fullName,
                              avatarData: _draftAvatar,
                              radius: 46),
                          const SizedBox(height: 10),
                          Wrap(spacing: 8, children: [
                            OutlinedButton.icon(
                                onPressed: _saving ? null : _selectPhoto,
                                icon: const Icon(Icons.camera_alt_outlined,
                                    size: 18),
                                label: Text(_draftAvatar == null
                                    ? 'Add photo'
                                    : 'Change photo')),
                            if (_draftAvatar != null)
                              TextButton.icon(
                                  onPressed: _saving ? null : _removePhoto,
                                  icon: const Icon(Icons.delete_outline_rounded,
                                      size: 18),
                                  label: const Text('Remove')),
                          ]),
                        ]),
                      ),
                      const SizedBox(height: 24),
                      const _EditorSectionTitle(
                          icon: Icons.phone_outlined, title: 'Contact number'),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'Mobile number',
                          prefixText: '+63 ',
                          prefixIcon: Icon(Icons.phone_outlined),
                          helperText: 'Enter the 10 digits after +63',
                        ),
                        validator: (value) => RegExp(r'^9\d{9}$')
                                .hasMatch(value ?? '')
                            ? null
                            : 'Enter a 10-digit Philippine mobile number starting with 9.',
                      ),
                      const SizedBox(height: 24),
                      const _EditorSectionTitle(
                          icon: Icons.location_on_outlined,
                          title: 'Present address'),
                      const SizedBox(height: 6),
                      const Text(
                          'Driver address updates are currently limited to Bohol.',
                          style: TextStyle(
                              fontSize: 10, color: TriSafeColors.muted)),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: 'Bohol',
                        enabled: false,
                        decoration: InputDecoration(
                            labelText: 'Province',
                            prefixIcon: Icon(Icons.map_outlined)),
                      ),
                      const SizedBox(height: 12),
                      if (_loadingLocations)
                        const _LocationLoadingCard()
                      else ...[
                        DropdownMenu<String>(
                          controller: _municipalityController,
                          width: double.infinity,
                          enableFilter: true,
                          enableSearch: true,
                          requestFocusOnTap: true,
                          label: const Text('Municipality / City'),
                          leadingIcon: const Icon(Icons.location_city_outlined),
                          dropdownMenuEntries: _municipalities
                              .map((item) => DropdownMenuEntry(
                                  value: item.code, label: item.name))
                              .toList(),
                          onSelected: (code) {
                            final selected = _municipalities
                                .where((item) => item.code == code)
                                .firstOrNull;
                            if (selected == null) return;
                            setState(() {
                              _municipality = selected;
                              _municipalityController.text = selected.name;
                              _locationError = null;
                            });
                            _loadBarangays(selected.code);
                          },
                        ),
                        const SizedBox(height: 12),
                        DropdownMenu<String>(
                          controller: _barangayController,
                          width: double.infinity,
                          enabled:
                              _municipality != null && _barangays.isNotEmpty,
                          enableFilter: true,
                          enableSearch: true,
                          requestFocusOnTap: true,
                          label: const Text('Barangay'),
                          leadingIcon: const Icon(Icons.location_on_outlined),
                          dropdownMenuEntries: _barangays
                              .map((item) => DropdownMenuEntry(
                                  value: item.code, label: item.name))
                              .toList(),
                          onSelected: (code) {
                            final selected = _barangays
                                .where((item) => item.code == code)
                                .firstOrNull;
                            if (selected == null) return;
                            setState(() {
                              _barangay = selected;
                              _barangayController.text = selected.name;
                              _locationError = null;
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _purokController,
                          maxLength: 100,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Purok / Street',
                            prefixIcon: Icon(Icons.signpost_outlined),
                          ),
                          validator: (value) {
                            final purok = value?.trim() ?? '';
                            if (purok.isEmpty) {
                              return 'Enter your Purok or Street.';
                            }
                            if (!RegExp(r"^[\p{L}\p{N} .,'#/-]+$",
                                    unicode: true)
                                .hasMatch(purok)) {
                              return 'Purok contains unsupported characters.';
                            }
                            return null;
                          },
                        ),
                      ],
                      if (_locationError != null) ...[
                        const SizedBox(height: 12),
                        _InlineError(message: _locationError!),
                      ],
                      if (_serverError != null) ...[
                        const SizedBox(height: 12),
                        _InlineError(message: _serverError!),
                      ],
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed:
                              _saving || _loadingLocations ? null : _save,
                          icon: _saving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.save_outlined),
                          label: Text(_saving
                              ? 'Saving changes...'
                              : 'Save profile changes'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: TextButton(
                          onPressed: _saving
                              ? null
                              : () => Navigator.pop(context, false),
                          child: const Text('Cancel'),
                        ),
                      ),
                    ]),
              ),
            ),
          ),
        ]),
      );
}

class _EditorSectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;

  const _EditorSectionTitle({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) => Row(children: [
        Icon(icon, size: 19, color: TriSafeColors.forest),
        const SizedBox(width: 8),
        Text(title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
      ]);
}

class _LocationLoadingCard extends StatelessWidget {
  const _LocationLoadingCard();

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(vertical: 18),
        child: Center(
          child: Column(children: [
            SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2)),
            SizedBox(height: 9),
            Text('Loading the official Bohol location directory...',
                style: TextStyle(fontSize: 10, color: TriSafeColors.muted)),
          ]),
        ),
      );
}

class _InlineError extends StatelessWidget {
  final String message;

  const _InlineError({required this.message});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: const Color(0xffffece9),
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: const Color(0xffffc9c2))),
        child: Text(message,
            style: const TextStyle(
                color: TriSafeColors.danger, fontSize: 10, height: 1.4)),
      );
}

String _imageMimeType(String filename) {
  final extension = filename.toLowerCase().split('.').last;
  return switch (extension) {
    'png' => 'image/png',
    'webp' => 'image/webp',
    _ => 'image/jpeg',
  };
}

String _friendlyProfileError(Object error) {
  final message = error.toString().toLowerCase();
  if (message.contains('already used')) {
    return 'That contact number is already used by another account.';
  }
  if (message.contains('2 mb')) {
    return 'The selected image must be 2 MB or smaller.';
  }
  if (message.contains('location directory') ||
      message.contains('temporarily unavailable')) {
    return 'The official Bohol location directory is temporarily unavailable. Please try again.';
  }
  if (message.contains('400')) {
    return 'Check the profile information and try again.';
  }
  return 'Your profile could not be updated. Please try again.';
}
