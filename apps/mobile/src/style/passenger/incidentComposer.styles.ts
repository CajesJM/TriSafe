import { StyleSheet } from "react-native";
import { colors, typography } from "../shared/theme";

export const incidentComposerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(9,15,11,.58)",
  },
  sheet: {
    maxHeight: "91%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.canvas,
  },
  content: { padding: 22, paddingBottom: 38, gap: 16 },
  title: { color: colors.ink, fontFamily: typography.extraBold, fontSize: 22 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  categoryActive: { borderColor: colors.limeDark, backgroundColor: "#E9F8E5" },
  categoryText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  categoryTextActive: { color: colors.forest },
  description: { minHeight: 130, paddingTop: 14, textAlignVertical: "top" },
  evidence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 15,
    padding: 13,
    backgroundColor: colors.surfaceSoft,
  },
  evidenceText: {
    flex: 1,
    color: colors.charcoal,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  preview: {
    borderLeftWidth: 3,
    borderLeftColor: colors.limeDark,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#EAF8E6",
  },
  previewText: {
    color: colors.forest,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
});
