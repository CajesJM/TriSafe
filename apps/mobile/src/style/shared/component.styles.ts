import { StyleSheet } from "react-native";
import { colors, typography } from "./theme";

export const componentStyles = StyleSheet.create({
  header: { gap: 7 },
  headerBack: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
  },
  headerCopy: { flex: 1 },
  headerAction: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  headerBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.canvas,
  },
  loadingText: { color: colors.muted, fontFamily: typography.medium },
  disabled: { opacity: 0.45 },
});
