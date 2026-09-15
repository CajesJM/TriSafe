import { StyleSheet } from "react-native";
import { colors, shadow, typography } from "./theme";

export const navigationStyles = StyleSheet.create({
  bar: {
    position: "absolute",
    right: 14,
    bottom: 12,
    left: 14,
    height: 72,
    borderTopWidth: 0,
    borderRadius: 24,
    paddingTop: 7,
    paddingBottom: 7,
    backgroundColor: colors.ink,
    ...shadow,
  },
  label: { fontFamily: typography.semibold, fontSize: 10 },
  scanButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -11,
    borderWidth: 4,
    borderColor: colors.canvas,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
});
