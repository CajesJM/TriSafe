import { StyleSheet } from "react-native";
import { colors, typography } from "../shared/theme";

export const driverVehicleStyles = StyleSheet.create({
  card: { gap: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  copy: { flex: 1 },
  plate: { color: colors.ink, fontFamily: typography.extraBold, fontSize: 19 },
  type: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  status: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#E8F8E4",
  },
  statusInactive: { backgroundColor: colors.dangerSoft },
  statusText: {
    color: colors.forest,
    fontFamily: typography.bold,
    fontSize: 9,
  },
  row: { flexDirection: "row", gap: 12, paddingVertical: 5 },
  label: {
    width: 112,
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
  },
  value: {
    flex: 1,
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  notice: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#EAF7E6",
  },
  noticeText: {
    flex: 1,
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 17,
  },
  disabled: { opacity: 0.45 },
});
