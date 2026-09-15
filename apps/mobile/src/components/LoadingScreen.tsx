import { ActivityIndicator, Text, View } from "react-native";
import { colors, typography } from "../style/shared/theme";
import { componentStyles } from "../style/shared/component.styles";

export function LoadingScreen({
  label = "Loading TriSafe…",
}: {
  label?: string;
}) {
  return (
    <View style={componentStyles.loading}>
      <ActivityIndicator color={colors.limeDark} size="large" />
      <Text style={componentStyles.loadingText}>{label}</Text>
    </View>
  );
}
