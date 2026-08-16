import 'package:flutter/material.dart';
import '../theme/trisafe_theme.dart';

class DriverBottomNavigation extends StatelessWidget {
  final int selectedIndex;
  final int unreadCount;
  final ValueChanged<int> onSelected;

  const DriverBottomNavigation({
    super.key,
    required this.selectedIndex,
    required this.unreadCount,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) => SafeArea(
        minimum: const EdgeInsets.fromLTRB(12, 0, 12, 10),
        child: Center(
          heightFactor: 1,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 720),
            height: 72,
            padding: const EdgeInsets.symmetric(horizontal: 7),
            decoration: BoxDecoration(
              color: TriSafeColors.black,
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x28000000),
                    blurRadius: 26,
                    offset: Offset(0, 10)),
              ],
            ),
            child: Row(children: [
              _DriverNavItem(
                  index: 0,
                  icon: Icons.space_dashboard_outlined,
                  activeIcon: Icons.space_dashboard_rounded,
                  label: 'Home',
                  selectedIndex: selectedIndex,
                  onSelected: onSelected),
              _DriverNavItem(
                  index: 1,
                  icon: Icons.electric_rickshaw_outlined,
                  activeIcon: Icons.electric_rickshaw_rounded,
                  label: 'Vehicle',
                  selectedIndex: selectedIndex,
                  onSelected: onSelected),
              Expanded(
                child: Semantics(
                  button: true,
                  label: 'Show my LGU QR code',
                  child: InkWell(
                    onTap: () => onSelected(2),
                    borderRadius: BorderRadius.circular(18),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          width: 43,
                          height: 43,
                          decoration: BoxDecoration(
                            color: selectedIndex == 2
                                ? TriSafeColors.lime
                                : Colors.white,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.qr_code_2_rounded,
                              color: TriSafeColors.black, size: 27),
                        ),
                        const SizedBox(height: 2),
                        const Text('My QR',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                ),
              ),
              _DriverNavItem(
                  index: 3,
                  icon: Icons.notifications_none_rounded,
                  activeIcon: Icons.notifications_rounded,
                  label: 'Updates',
                  badge: unreadCount,
                  selectedIndex: selectedIndex,
                  onSelected: onSelected),
              _DriverNavItem(
                  index: 4,
                  icon: Icons.person_outline_rounded,
                  activeIcon: Icons.person_rounded,
                  label: 'Profile',
                  selectedIndex: selectedIndex,
                  onSelected: onSelected),
            ]),
          ),
        ),
      );
}

class _DriverNavItem extends StatelessWidget {
  final int index;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final int badge;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _DriverNavItem({
    required this.index,
    required this.icon,
    required this.activeIcon,
    required this.label,
    this.badge = 0,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final selected = selectedIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () => onSelected(index),
        borderRadius: BorderRadius.circular(16),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Badge(
            isLabelVisible: badge > 0,
            label: Text(badge > 9 ? '9+' : '$badge'),
            child: Icon(selected ? activeIcon : icon,
                color: selected ? TriSafeColors.lime : const Color(0xffaeb5ae),
                size: 21),
          ),
          const SizedBox(height: 5),
          Text(label,
              maxLines: 1,
              style: TextStyle(
                  color: selected ? Colors.white : const Color(0xffaeb5ae),
                  fontSize: 9,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600)),
        ]),
      ),
    );
  }
}
