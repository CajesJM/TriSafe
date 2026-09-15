import { StyleSheet } from "react-native";
import { colors, typography } from "../shared/theme";

export const driverAnnouncementsStyles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12 },
  unread: { borderColor: colors.limeDark, backgroundColor: "#F4FCF2" },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF7E6",
  },
  copy: { flex: 1, gap: 5 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: {
    flex: 1,
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
  body: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 17,
  },
  date: { color: colors.subtle, fontFamily: typography.medium, fontSize: 9 },
  image: { width: "100%", height: 140, borderRadius: 14 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(9,15,11,.58)",
  },
  detail: {
    maxHeight: "82%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 38,
    gap: 14,
    backgroundColor: colors.canvas,
  },
  detailTitle: {
    color: colors.ink,
    fontFamily: typography.extraBold,
    fontSize: 22,
  },
  detailBody: {
    color: colors.charcoal,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 22,
  },
});
