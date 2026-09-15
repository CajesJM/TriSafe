import { StyleSheet } from "react-native";
import { colors, shadow, typography } from "./theme";

export const toastStyles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 12,
    right: 16,
    left: 16,
    zIndex: 999,
    alignItems: "center",
  },
  toast: {
    width: "100%",
    maxWidth: 430,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 15,
    padding: 9,
    ...shadow,
  },
  success: { borderColor: "#A9D8B9", backgroundColor: "#ECF9F0" },
  error: { borderColor: "#F0B5B5", backgroundColor: "#FFF0F0" },
  info: { borderColor: "#AED2EB", backgroundColor: "#EDF7FD" },
  icon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  copy: { flex: 1 },
  title: { color: colors.ink, fontFamily: typography.bold, fontSize: 12 },
  message: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
