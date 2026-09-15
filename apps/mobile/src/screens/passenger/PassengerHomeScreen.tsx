import { useEffect, useRef, useState } from "react";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { usePassenger } from "../../context/PassengerContext";
import { useToast } from "../../context/ToastContext";
import { trisafeApi } from "../../services/trisafeApi";
import { commonStyles } from "../../style/shared/common.styles";
import { passengerHomeStyles as styles } from "../../style/passenger/passengerHomeScreen.styles";
import { colors } from "../../style/shared/theme";
import { money, rideFare } from "../../utils/format";

export function PassengerHomeScreen() {
  const navigation = useNavigation();
  const {
    profile,
    rides,
    incidents,
    contacts,
    verifiedRide,
    activeRide,
    latestLocation,
    loading,
    refresh,
  } = usePassenger();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const heroList = useRef<FlatList<HeroContent>>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const completed = rides.filter((ride) => ride.status === "COMPLETED");
  const fareTotal = completed.reduce((sum, ride) => sum + rideFare(ride), 0);
  const username =
    profile?.username || profile?.fullName.split(" ")[0] || "Passenger";
  const initials = (profile?.fullName ?? "Passenger")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const navigate = (name: string) =>
    navigation.dispatch(CommonActions.navigate(name));
  const heroWidth = Math.max(280, width - 40);
  const heroItems: HeroContent[] = [
    {
      badge: "RIDE SAFETY",
      icon: "shield-checkmark",
      title: activeRide
        ? "Your verified ride is active"
        : verifiedRide
          ? "Driver verified. Plan your trip."
          : "Verify before you ride",
      body: activeRide
        ? "TriSafe is recording your ride distance and current official fare."
        : verifiedRide
          ? `${verifiedRide.result.vehicle?.driverName} · ${verifiedRide.result.vehicle?.plateNumber}`
          : "Scan the LGU-issued QR to confirm the driver, operator, vehicle, franchise, and rating.",
      primary: activeRide
        ? "View ride"
        : verifiedRide
          ? "Continue ride"
          : "Scan driver QR",
      primaryIcon: activeRide ? "navigate" : verifiedRide ? "map" : "qr-code",
      primaryAction: () =>
        navigate(activeRide ? "Rides" : verifiedRide ? "Fare" : "Scan"),
      secondary: "Check fare",
      secondaryIcon: "cash-outline",
      secondaryAction: () => navigate("Fare"),
      tone: "dark",
    },
    {
      badge: "FARE CONFIDENCE",
      icon: "map-outline",
      title: "Know the official fare",
      body: "Choose a destination and TriSafe follows the road route using the current LGU rate and passenger discount.",
      primary: "Estimate fare",
      primaryIcon: "calculator-outline",
      primaryAction: () => navigate("Fare"),
      secondary: "Ride history",
      secondaryIcon: "time-outline",
      secondaryAction: () => navigate("Rides"),
      tone: "blue",
    },
    {
      badge: "SAFETY NETWORK",
      icon: "people-outline",
      title: contacts.length
        ? `${contacts.length} trusted contact${contacts.length === 1 ? "" : "s"} ready`
        : "Prepare your safety network",
      body: contacts.length
        ? "During an active ride, SafeShare can send verified trip details and your latest location."
        : "Add a trusted person now so SafeShare and SOS are ready before your next journey.",
      primary: contacts.length ? "Use SafeShare" : "Add contact",
      primaryIcon: contacts.length
        ? "share-social-outline"
        : "person-add-outline",
      primaryAction: contacts.length
        ? shareRide
        : () =>
            navigation.dispatch(
              CommonActions.navigate({ name: "TrustedContacts" }),
            ),
      secondary: "Report history",
      secondaryIcon: "document-text-outline",
      secondaryAction: () =>
        navigation.dispatch(CommonActions.navigate({ name: "Reports" })),
      tone: "warm",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (heroIndex + 1) % heroItems.length;
      heroList.current?.scrollToIndex({ index: next, animated: true });
      setHeroIndex(next);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroIndex, heroItems.length]);

  async function shareRide() {
    if (!activeRide) {
      showToast("Start a ride before using SafeShare.", "info");
      return;
    }
    try {
      const payload = await trisafeApi.shareRide(
        activeRide.id,
        latestLocation?.coords.latitude,
        latestLocation?.coords.longitude,
      );
      const message =
        typeof payload.message === "string"
          ? payload.message
          : JSON.stringify(payload, null, 2);
      await Share.share({ title: "TriSafe SafeShare", message });
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Ride details could not be shared.",
        "error",
      );
    }
  }

  async function sos() {
    try {
      const emergency = (await trisafeApi.emergencyContacts()).find(
        (contact) => contact.active,
      );
      const trusted = contacts.find((contact) => contact.active);
      const phone = trusted?.phone ?? emergency?.phone;
      if (!phone)
        throw new Error("No active emergency or trusted contact is available.");
      await Linking.openURL(`tel:${phone}`);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Emergency contact is unavailable.",
        "error",
      );
    }
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return showToast("Photo library access is required.", "error");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (!asset?.base64) return;
    try {
      await trisafeApi.updatePassengerProfile({
        avatarData: `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`,
      });
      await refresh();
      showToast("Profile photo updated.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Photo could not be updated.",
        "error",
      );
    }
  }

  return (
    <View style={styles.backdrop}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.limeDark}
          />
        }
        contentContainerStyle={commonStyles.scrollContent}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.username}>{username}</Text>
              <Text style={styles.date}>{shortDate(new Date())}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Notifications"
                onPress={() => setNotificationsOpen(true)}
                style={styles.circleButton}
              >
                <Ionicons
                  name="notifications-outline"
                  size={21}
                  color={colors.ink}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Choose profile photo"
                onPress={() => void choosePhoto()}
                style={styles.avatarButton}
              >
                {profile?.avatarData ? (
                  <Image
                    source={{ uri: profile.avatarData }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                <View style={styles.avatarCamera}>
                  <Ionicons name="camera" size={11} color={colors.ink} />
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.heroViewport}>
          <FlatList
            ref={heroList}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={heroItems}
            keyExtractor={(item) => item.badge}
            getItemLayout={(_, index) => ({
              length: heroWidth,
              offset: heroWidth * index,
              index,
            })}
            onViewableItemsChanged={({
              viewableItems,
            }: {
              viewableItems: ViewToken<HeroContent>[];
            }) => {
              const index = viewableItems[0]?.index;
              if (index !== null && index !== undefined) setHeroIndex(index);
            }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item }) => (
              <View style={[styles.heroSlide, { width: heroWidth }]}>
                <View
                  style={[
                    styles.hero,
                    item.tone === "blue" && styles.heroBlue,
                    item.tone === "warm" && styles.heroWarm,
                  ]}
                >
                  <View style={styles.heroBadge}>
                    <Ionicons name={item.icon} size={15} color={colors.lime} />
                    <Text style={styles.heroBadgeText}>{item.badge}</Text>
                  </View>
                  <Text style={styles.heroTitle}>{item.title}</Text>
                  <Text style={styles.heroBody}>{item.body}</Text>
                  <View style={styles.heroActions}>
                    <Pressable
                      onPress={item.primaryAction}
                      style={styles.heroPrimary}
                    >
                      <Ionicons
                        name={item.primaryIcon}
                        size={18}
                        color={colors.ink}
                      />
                      <Text style={styles.heroPrimaryText}>{item.primary}</Text>
                    </Pressable>
                    <Pressable
                      onPress={item.secondaryAction}
                      style={styles.heroSecondary}
                    >
                      <Ionicons
                        name={item.secondaryIcon}
                        size={18}
                        color={colors.surface}
                      />
                      <Text style={styles.heroSecondaryText}>
                        {item.secondary}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />
        </View>
        <View style={styles.pageDots}>
          {heroItems.map((item, index) => (
            <View
              key={item.badge}
              style={[
                styles.pageDot,
                index === heroIndex && styles.pageDotActive,
              ]}
            />
          ))}
        </View>

        <Section
          title="Journey overview"
          subtitle="Your personal TriSafe activity"
        />
        <View style={styles.statGrid}>
          <Stat
            icon="checkmark-done"
            value={String(completed.length)}
            label="Completed rides"
            tone="green"
          />
          <Stat
            icon="wallet-outline"
            value={money(fareTotal)}
            label="Recorded fares"
            tone="blue"
          />
          <Stat
            icon="document-text-outline"
            value={String(incidents.length)}
            label="Incident reports"
          />
          <Stat
            icon="people-outline"
            value={String(contacts.length)}
            label="Trusted contacts"
          />
        </View>

        <Section
          title="Quick actions"
          subtitle="Essential travel and safety tools"
        />
        <View style={styles.quickGrid}>
          <Quick
            icon="qr-code-outline"
            label="Scan QR"
            onPress={() => navigate("Scan")}
          />
          <Quick
            icon="cash-outline"
            label="Fare"
            onPress={() => navigate("Fare")}
          />
          <Quick
            icon="share-social-outline"
            label="SafeShare"
            onPress={shareRide}
          />
          <Quick icon="warning-outline" label="SOS" onPress={sos} danger />
        </View>

        <View style={commonStyles.rowBetween}>
          <Section title="Recent rides" subtitle="Your latest verified trips" />
          <Pressable onPress={() => navigate("Rides")}>
            <Text style={commonStyles.badgeText}>View all</Text>
          </Pressable>
        </View>
        {rides.slice(0, 3).map((ride) => (
          <Pressable
            key={ride.id}
            onPress={() => navigate("Rides")}
            style={styles.recentCard}
          >
            <View style={styles.recentIcon}>
              <Ionicons
                name="navigate-outline"
                size={20}
                color={colors.forest}
              />
            </View>
            <View style={styles.recentCopy}>
              <Text style={styles.recentTitle}>
                {ride.vehicle?.driver?.user?.fullName ?? "Verified driver"}
              </Text>
              <Text style={styles.recentMeta}>
                {ride.fromLocationName ?? "Origin"} →{" "}
                {ride.toLocationName ?? "Destination"}
              </Text>
            </View>
            <Text style={styles.fare}>{money(rideFare(ride))}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Modal
        transparent
        animationType="fade"
        visible={notificationsOpen}
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNotificationsOpen(false)}
        >
          <Pressable style={styles.notificationSheet} onPress={() => undefined}>
            <View style={commonStyles.rowBetween}>
              <View>
                <Text style={commonStyles.eyebrow}>Passenger updates</Text>
                <Text style={styles.notificationTitle}>Notifications</Text>
              </View>
              <Pressable
                accessibilityLabel="Close notifications"
                onPress={() => setNotificationsOpen(false)}
              >
                <Ionicons name="close" size={25} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.notificationEmpty}>
              <Ionicons
                name="notifications-outline"
                size={36}
                color={colors.subtle}
              />
              <Text style={commonStyles.sectionTitle}>
                You’re all caught up
              </Text>
              <Text style={commonStyles.body}>
                No new passenger notifications.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Section({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone?: "green" | "blue";
}) {
  return (
    <View
      style={[
        styles.stat,
        tone === "green" && styles.statGreen,
        tone === "blue" && styles.statBlue,
      ]}
    >
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={colors.forest} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Quick({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <View style={[styles.quickIcon, danger && styles.quickIconDanger]}>
        <Ionicons
          name={icon}
          size={19}
          color={danger ? colors.danger : colors.limeDark}
        />
      </View>
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}

type HeroContent = {
  badge: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  primary: string;
  primaryIcon: keyof typeof Ionicons.glyphMap;
  primaryAction: () => void;
  secondary: string;
  secondaryIcon: keyof typeof Ionicons.glyphMap;
  secondaryAction: () => void;
  tone: "dark" | "blue" | "warm";
};

function greeting() {
  const hour = new Date().getHours();
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en-PH", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}
