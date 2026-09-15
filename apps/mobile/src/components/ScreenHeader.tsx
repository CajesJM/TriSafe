import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles } from "../style/shared/common.styles";
import { colors } from "../style/shared/theme";
import { componentStyles } from "../style/shared/component.styles";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    badge?: number;
  };
}) {
  return (
    <View style={componentStyles.header}>
      <View style={commonStyles.rowBetween}>
        <View style={[commonStyles.row, { flex: 1, gap: 10 }]}>
          {onBack && (
            <Pressable
              accessibilityLabel="Go back"
              onPress={onBack}
              style={componentStyles.headerBack}
            >
              <Ionicons name="arrow-back" size={22} color={colors.ink} />
            </Pressable>
          )}
          <View style={componentStyles.headerCopy}>
            {eyebrow && <Text style={commonStyles.eyebrow}>{eyebrow}</Text>}
            <Text style={commonStyles.title}>{title}</Text>
          </View>
        </View>
        {action && (
          <Pressable
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={componentStyles.headerAction}
          >
            <Ionicons name={action.icon} size={21} color={colors.ink} />
            {!!action.badge && <View style={componentStyles.headerBadge} />}
          </Pressable>
        )}
      </View>
      {subtitle && <Text style={commonStyles.body}>{subtitle}</Text>}
    </View>
  );
}
