import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useDriver } from "../../context/DriverContext";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { driverHomeStyles as styles } from "../../style/driver/driverHomeScreen.styles";
import { titleCase } from "../../utils/format";

export function DriverHomeScreen() {
  const navigation = useNavigation();
  const {
    profile,
    notifications,
    announcements,
    violations,
    ratings,
    loading,
    refresh,
    readNotification,
    readAllNotifications,
  } = useDriver();
  const pending = notifications.filter((item) => !item.readAt);
  const initials = (profile?.fullName ?? "Driver")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={commonStyles.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
          />
        }
        contentContainerStyle={commonStyles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Driver operations</Text>
              <Text style={styles.name}>
                Hello, {profile?.username ?? "driver"}
              </Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          </View>
          <View style={styles.status}>
            <Ionicons name="shield-checkmark" size={15} color={colors.lime} />
            <Text style={styles.statusText}>
              {titleCase(profile?.verification ?? "Loading")} ·{" "}
              {titleCase(profile?.accountStatus ?? "")}
            </Text>
          </View>
        </View>
        <View style={styles.grid}>
          <Stat
            icon="car-sport-outline"
            value={String(profile?.vehicles.length ?? 0)}
            label="Registered vehicles"
            onPress={() =>
              navigation.dispatch(CommonActions.navigate({ name: "Vehicle" }))
            }
          />
          <Stat
            icon="star-outline"
            value={ratings?.average?.toFixed(1) ?? "—"}
            label={`${ratings?.totalReviews ?? 0} passenger reviews`}
          />
          <Stat
            icon="warning-outline"
            value={String(
              violations.filter(
                (item) => !["RESOLVED", "DISMISSED"].includes(item.status),
              ).length,
            )}
            label="Open violations"
          />
          <Stat
            icon="megaphone-outline"
            value={String(announcements.filter((item) => !item.readAt).length)}
            label="Unread announcements"
            onPress={() =>
              navigation.dispatch(CommonActions.navigate({ name: "Updates" }))
            }
          />
        </View>
        <View style={styles.sectionRow}>
          <Text style={commonStyles.sectionTitle}>Notifications</Text>
          {pending.length ? (
            <Pressable onPress={() => void readAllNotifications()}>
              <Text style={styles.link}>Mark all read</Text>
            </Pressable>
          ) : (
            <Text style={styles.link}>All read</Text>
          )}
        </View>
        {notifications.map((item) => (
          <Pressable
            key={item.id}
            style={[
              commonStyles.card,
              styles.notification,
              !item.readAt && styles.notificationUnread,
            ]}
            onPress={() => void readNotification(item.id)}
          >
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationText}>{item.message}</Text>
          </Pressable>
        ))}
        {!notifications.length && (
          <View style={commonStyles.empty}>
            <Ionicons
              name="notifications-off-outline"
              size={34}
              color={colors.subtle}
            />
            <Text style={commonStyles.body}>No driver notifications.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
function Stat({
  icon,
  value,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[commonStyles.card, styles.stat]}
    >
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color={colors.ink} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}
