import { StyleSheet } from "react-native";
import { colors, shadow, typography } from "../shared/theme";

export const driverHomeStyles = StyleSheet.create({
  header: {
    overflow: "hidden",
    borderRadius: 26,
    padding: 20,
    gap: 14,
    backgroundColor: colors.ink,
    ...shadow,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    color: "#B9C5BC",
    fontFamily: typography.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  name: {
    color: colors.surface,
    fontFamily: typography.extraBold,
    fontSize: 28,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#273029",
  },
  initials: { color: colors.lime, fontFamily: typography.bold, fontSize: 15 },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "#233D26",
  },
  statusText: { color: colors.lime, fontFamily: typography.bold, fontSize: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { width: "48%", minHeight: 118, gap: 7 },
  statIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6E7",
  },
  statValue: {
    color: colors.ink,
    fontFamily: typography.extraBold,
    fontSize: 24,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: { color: colors.limeDark, fontFamily: typography.bold, fontSize: 12 },
  notification: { gap: 6 },
  notificationUnread: {
    borderColor: colors.limeDark,
    backgroundColor: "#F3FCF0",
  },
  notificationTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  notificationText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
  },
});
