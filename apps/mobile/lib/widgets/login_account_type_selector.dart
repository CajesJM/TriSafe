import 'package:flutter/material.dart';
import '../theme/trisafe_theme.dart';

enum MobileAccountType { passenger, driver }

class LoginAccountTypeSelector extends StatelessWidget {
  final MobileAccountType selectedType;
  final ValueChanged<MobileAccountType> onChanged;

  const LoginAccountTypeSelector({
    super.key,
    required this.selectedType,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Choose account type',
        child: Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: const Color(0xffe9eee7),
            borderRadius: BorderRadius.circular(17),
          ),
          child: Row(children: [
            Expanded(
              child: _AccountTypeOption(
                type: MobileAccountType.passenger,
                selected: selectedType == MobileAccountType.passenger,
                icon: Icons.person_outline_rounded,
                label: 'Passenger',
                onTap: () => onChanged(MobileAccountType.passenger),
              ),
            ),
            Expanded(
              child: _AccountTypeOption(
                type: MobileAccountType.driver,
                selected: selectedType == MobileAccountType.driver,
                icon: Icons.electric_rickshaw_outlined,
                label: 'Driver',
                onTap: () => onChanged(MobileAccountType.driver),
              ),
            ),
          ]),
        ),
      );
}

class _AccountTypeOption extends StatelessWidget {
  final MobileAccountType type;
  final bool selected;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AccountTypeOption({
    required this.type,
    required this.selected,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        label: '$label account',
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(13),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: selected ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(13),
              boxShadow: selected
                  ? const [
                      BoxShadow(
                        color: Color(0x12000000),
                        blurRadius: 8,
                        offset: Offset(0, 3),
                      ),
                    ]
                  : null,
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(icon,
                  size: 19,
                  color: selected ? TriSafeColors.forest : TriSafeColors.muted),
              const SizedBox(width: 7),
              Text(label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: selected ? TriSafeColors.black : TriSafeColors.muted,
                  )),
            ]),
          ),
        ),
      );
}
