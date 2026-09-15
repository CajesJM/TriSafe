export const colors = {
  lime: "#57DF28",
  limeDark: "#2F8B1D",
  forest: "#174B35",
  ink: "#101511",
  charcoal: "#26302A",
  muted: "#69746D",
  subtle: "#98A29C",
  line: "#DDE4DF",
  surface: "#FFFFFF",
  surfaceSoft: "#F3F7F3",
  canvas: "#F7F9F7",
  danger: "#B42318",
  dangerSoft: "#FDE8E7",
  warning: "#9A6700",
  warningSoft: "#FFF1CC",
  info: "#1769AA",
  infoSoft: "#E3F1FC",
} as const;

export const typography = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
} as const;

export const shadow = {
  shadowColor: "#173126",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 20,
  elevation: 4,
} as const;
