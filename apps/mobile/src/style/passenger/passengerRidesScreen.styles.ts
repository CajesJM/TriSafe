import { StyleSheet } from "react-native";
import { colors, typography } from "../shared/theme";

export const passengerRidesStyles = StyleSheet.create({
  filter: { flexDirection: "row", gap: 8 },
  filterItem: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  filterActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  filterText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  filterTextActive: { color: colors.surface },
  ride: { gap: 13 },
  rideTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  driver: {
    flex: 1,
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  fare: {
    color: colors.forest,
    fontFamily: typography.extraBold,
    fontSize: 18,
  },
  route: { flexDirection: "row", gap: 10 },
  routeLine: { alignItems: "center", paddingTop: 2 },
  routeStroke: {
    width: 2,
    flex: 1,
    minHeight: 22,
    backgroundColor: colors.line,
  },
  routeText: { flex: 1, gap: 11 },
  place: {
    color: colors.charcoal,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  meta: { color: colors.muted, fontFamily: typography.regular, fontSize: 11 },
  cardActions: { flexDirection: "row", gap: 8 },
  smallAction: { flex: 1, minHeight: 42 },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 5,
  },
  comment: { minHeight: 85, paddingTop: 13, textAlignVertical: "top" },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(9,15,11,.58)",
  },
  modalCard: { width: "100%", gap: 14 },
});
