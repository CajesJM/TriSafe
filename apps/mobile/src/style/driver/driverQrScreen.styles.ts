import { StyleSheet } from "react-native";
import { colors, typography } from "../shared/theme";

export const driverQrStyles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
    borderRadius: 15,
    backgroundColor: colors.surfaceSoft,
  },
  selectorItem: {
    flex: 1,
    alignItems: "center",
    borderRadius: 11,
    padding: 10,
  },
  selectorActive: { backgroundColor: colors.surface },
  selectorText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  selectorTextActive: { color: colors.ink },
  card: { borderRadius: 26, padding: 20, gap: 16, backgroundColor: colors.ink },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: colors.lime,
    fontFamily: typography.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  plate: {
    marginTop: 4,
    color: colors.surface,
    fontFamily: typography.extraBold,
    fontSize: 20,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#234128",
  },
  badgeInactive: { backgroundColor: "#4A2A28" },
  badgeText: {
    color: colors.surface,
    fontFamily: typography.bold,
    fontSize: 9,
  },
  qr: {
    alignItems: "center",
    borderRadius: 20,
    padding: 22,
    backgroundColor: colors.surface,
  },
  explanation: {
    color: "#C6D0C8",
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  generated: {
    color: "#89938C",
    fontFamily: typography.medium,
    fontSize: 9,
    textAlign: "center",
  },
  notice: {
    borderRadius: 15,
    padding: 14,
    backgroundColor: colors.warningSoft,
  },
  noticeText: {
    color: colors.warning,
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 17,
  },
});
