import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { usePassenger } from "../../context/PassengerContext";
import { useToast } from "../../context/ToastContext";
import { PolicyModal } from "../../components/PolicyModal";
import type { PassengerStackParamList } from "../../navigation/PassengerNavigator";
import { trisafeApi } from "../../services/trisafeApi";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { passengerProfileStyles as styles } from "../../style/passenger/passengerProfileScreen.styles";

type EditMode = "profile" | "password" | null;

export function PassengerProfileScreen() {
  const navigation = useNavigation<NavigationProp<PassengerStackParamList>>();
  const { profile, incidents, contacts, refresh } = usePassenger();
  const { logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<EditMode>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    phone: "",
    email: "",
  });
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const initials = (profile?.fullName ?? "Passenger")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
      await Promise.all([refresh(), refreshUser()]);
      showToast("Profile photo updated.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Photo could not be updated.",
        "error",
      );
    }
  }
  function editProfile() {
    setForm({
      fullName: profile?.fullName ?? "",
      username: profile?.username ?? "",
      phone: profile?.phone ?? "",
      email: profile?.email ?? "",
    });
    setMode("profile");
  }
  async function saveProfile() {
    try {
      await trisafeApi.updatePassengerProfile(form);
      await Promise.all([refresh(), refreshUser()]);
      setMode(null);
      showToast("Profile updated.", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Profile could not be updated.",
        "error",
      );
    }
  }
  async function savePassword() {
    if (password.next.length < 8 || password.next !== password.confirm)
      return showToast(
        "New passwords must match and contain at least 8 characters.",
        "error",
      );
    try {
      await trisafeApi.changePassword(password.current, password.next);
      setMode(null);
      setPassword({ current: "", next: "", confirm: "" });
      showToast("Password changed.", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Password could not be changed.",
        "error",
      );
    }
  }

  return (
    <View style={commonStyles.screen}>
      <ScrollView contentContainerStyle={commonStyles.scrollContent}>
        <View>
          <Text style={commonStyles.eyebrow}>Account</Text>
          <Text style={commonStyles.title}>Passenger profile</Text>
          <Text style={commonStyles.body}>
            Your identity information is loaded securely from TriSafe.
          </Text>
        </View>
        <View style={styles.hero}>
          <Pressable
            accessibilityLabel="Choose profile photo"
            style={styles.avatarWrap}
            onPress={() => void choosePhoto()}
          >
            {profile?.avatarData ? (
              <Image
                source={{ uri: profile.avatarData }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
            )}
            <View style={styles.camera}>
              <Ionicons name="camera" size={17} color={colors.ink} />
            </View>
          </Pressable>
          <Text style={styles.name}>{profile?.fullName ?? "Passenger"}</Text>
          <Text style={styles.username}>
            @{profile?.username ?? "passenger"}
          </Text>
          <View style={styles.verified}>
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={colors.limeDark}
            />
            <Text style={styles.verifiedText}>Verified passenger</Text>
          </View>
        </View>
        <MenuGroup
          items={[
            {
              icon: "person-outline",
              title: "Personal information",
              subtitle:
                profile?.email ?? profile?.phone ?? "Manage account details",
              action: editProfile,
            },
            {
              icon: "people-outline",
              title: "Trusted contacts",
              subtitle: `${contacts.length} safety contacts`,
              action: () => navigation.navigate("TrustedContacts"),
            },
            {
              icon: "document-text-outline",
              title: "Report history",
              subtitle: `${incidents.length} incident reports`,
              action: () => navigation.navigate("Reports"),
            },
            {
              icon: "lock-closed-outline",
              title: "Change password",
              subtitle: "Update account security",
              action: () => setMode("password"),
            },
            {
              icon: "document-outline",
              title: "Terms and privacy",
              subtitle: "Read the current LGU policy",
              action: () => setPolicyOpen(true),
            },
          ]}
        />
        <MenuGroup
          items={[
            {
              icon: "log-out-outline",
              title: "Sign out",
              subtitle: "End this secure session",
              action: () => void logout(),
              danger: true,
            },
          ]}
        />
      </ScrollView>
      <PolicyModal visible={policyOpen} onClose={() => setPolicyOpen(false)} />
      <Modal
        transparent
        animationType="slide"
        visible={Boolean(mode)}
        onRequestClose={() => setMode(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={commonStyles.rowBetween}>
              <Text style={styles.sheetTitle}>
                {mode === "profile" ? "Edit profile" : "Change password"}
              </Text>
              <Pressable onPress={() => setMode(null)}>
                <Ionicons name="close" size={25} color={colors.ink} />
              </Pressable>
            </View>
            {mode === "profile" ? (
              <>
                <TextInput
                  placeholder="Full name"
                  value={form.fullName}
                  onChangeText={(fullName) =>
                    setForm((value) => ({ ...value, fullName }))
                  }
                  style={commonStyles.input}
                />
                <TextInput
                  autoCapitalize="none"
                  placeholder="Username"
                  value={form.username}
                  onChangeText={(username) =>
                    setForm((value) => ({ ...value, username }))
                  }
                  style={commonStyles.input}
                />
                <TextInput
                  keyboardType="phone-pad"
                  placeholder="Phone"
                  value={form.phone}
                  onChangeText={(phone) =>
                    setForm((value) => ({ ...value, phone }))
                  }
                  style={commonStyles.input}
                />
                <TextInput
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Email"
                  value={form.email}
                  onChangeText={(email) =>
                    setForm((value) => ({ ...value, email }))
                  }
                  style={commonStyles.input}
                />
                <Pressable
                  style={commonStyles.button}
                  onPress={() => void saveProfile()}
                >
                  <Text style={commonStyles.buttonText}>Save changes</Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  secureTextEntry
                  placeholder="Current password"
                  value={password.current}
                  onChangeText={(current) =>
                    setPassword((value) => ({ ...value, current }))
                  }
                  style={commonStyles.input}
                />
                <TextInput
                  secureTextEntry
                  placeholder="New password"
                  value={password.next}
                  onChangeText={(next) =>
                    setPassword((value) => ({ ...value, next }))
                  }
                  style={commonStyles.input}
                />
                <TextInput
                  secureTextEntry
                  placeholder="Confirm new password"
                  value={password.confirm}
                  onChangeText={(confirm) =>
                    setPassword((value) => ({ ...value, confirm }))
                  }
                  style={commonStyles.input}
                />
                <Pressable
                  style={commonStyles.button}
                  onPress={() => void savePassword()}
                >
                  <Text style={commonStyles.buttonText}>Change password</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuGroup({
  items,
}: {
  items: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    action: () => void;
    danger?: boolean;
  }[];
}) {
  return (
    <View style={styles.group}>
      {items.map((item, index) => (
        <View key={item.title}>
          {index > 0 && <View style={styles.separator} />}
          <Pressable style={styles.menu} onPress={item.action}>
            <View style={styles.menuIcon}>
              <Ionicons
                name={item.icon}
                size={20}
                color={item.danger ? colors.danger : colors.limeDark}
              />
            </View>
            <View style={styles.menuCopy}>
              <Text style={[styles.menuTitle, item.danger && styles.danger]}>
                {item.title}
              </Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
