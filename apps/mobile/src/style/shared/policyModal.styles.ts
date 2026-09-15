import { StyleSheet } from "react-native";
import { colors, typography } from "./theme";

export const policyModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(9,15,11,.58)",
  },
  sheet: {
    maxHeight: "86%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.canvas,
  },
  content: { padding: 22, paddingBottom: 38, gap: 14 },
  title: { color: colors.ink, fontFamily: typography.extraBold, fontSize: 22 },
  body: {
    color: colors.charcoal,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 21,
  },
  meta: { color: colors.muted, fontFamily: typography.medium, fontSize: 10 },
});
