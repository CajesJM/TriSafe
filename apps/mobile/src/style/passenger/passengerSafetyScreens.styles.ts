import { StyleSheet } from "react-native";
import { colors, typography } from "../shared/theme";

export const passengerSafetyStyles = StyleSheet.create({
  item: { gap: 11 },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  itemTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  itemText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  badgeDraft: { backgroundColor: colors.warningSoft },
  badgeError: { backgroundColor: colors.dangerSoft },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, minHeight: 42 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(9,15,11,.58)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 38,
    gap: 14,
    backgroundColor: colors.canvas,
  },
  sheetTitle: {
    color: colors.ink,
    fontFamily: typography.extraBold,
    fontSize: 22,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 15,
    padding: 14,
    backgroundColor: colors.surface,
  },
  dangerText: {
    color: colors.danger,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
});
