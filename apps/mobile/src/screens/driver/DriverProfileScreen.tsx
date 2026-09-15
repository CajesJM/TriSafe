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
import { useAuth } from "../../context/AuthContext";
import { useDriver } from "../../context/DriverContext";
import { useToast } from "../../context/ToastContext";
import { PolicyModal } from "../../components/PolicyModal";
import { trisafeApi } from "../../services/trisafeApi";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { driverProfileStyles as styles } from "../../style/driver/driverProfileScreen.styles";
import { formatDate, titleCase } from "../../utils/format";

export function DriverProfileScreen() {
  const { profile, violations, ratings, refresh } = useDriver();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"phone" | "password" | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const initials = (profile?.fullName ?? "Driver")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const owner = profile?.owner
    ? [
        profile.owner.firstName,
        profile.owner.middleName,
        profile.owner.lastName,
      ]
        .filter(Boolean)
        .join(" ")
    : "Not recorded";
  const address = profile?.address
    ? [
        profile.address.streetPurok ?? profile.address.purok,
        profile.address.barangayName,
        profile.address.municipalityName,
        profile.address.provinceName,
      ]
        .filter(Boolean)
        .join(", ")
    : "Not recorded";
  async function photo() {
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
      await trisafeApi.updateDriverProfile({
        avatarData: `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`,
      });
      await refresh();
      showToast("Driver photo updated.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Photo update failed.",
        "error",
      );
    }
  }
  async function savePhone() {
    try {
      await trisafeApi.updateDriverProfile({ phone });
      await refresh();
      setMode(null);
      showToast("Phone number updated.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Phone update failed.",
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
        error instanceof Error ? error.message : "Password update failed.",
        "error",
      );
    }
  }
  return (
    <View style={commonStyles.screen}>
      <ScrollView contentContainerStyle={commonStyles.scrollContent}>
        <View>
          <Text style={commonStyles.eyebrow}>My account</Text>
          <Text style={commonStyles.title}>Driver profile</Text>
          <Text style={commonStyles.body}>
            Review your verified identity and official transport record.
          </Text>
        </View>
        <View style={styles.hero}>
          <Pressable style={styles.avatarWrap} onPress={() => void photo()}>
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
          <Text style={styles.name}>{profile?.fullName ?? "Driver"}</Text>
          <Text style={styles.username}>
            @{profile?.username ?? "driver"} ·{" "}
            {titleCase(profile?.verification ?? "")}
          </Text>
        </View>
        <View style={styles.stats}>
          <Stat
            value={ratings?.average?.toFixed(1) ?? "—"}
            label="Average rating"
          />
          <Stat value={String(ratings?.totalReviews ?? 0)} label="Reviews" />
          <Stat
            value={String(
              violations.filter(
                (item) => !["RESOLVED", "DISMISSED"].includes(item.status),
              ).length,
            )}
            label="Open violations"
          />
        </View>
        <View style={commonStyles.card}>
          {[
            ["Full name", profile?.fullName ?? ""],
            ["Login identifier", profile?.username ?? ""],
            ["Operator", owner],
            ["Phone", profile?.phone ?? "Not provided"],
            ["Present address", address],
            [
              "Franchise",
              profile?.franchise?.franchiseNumber ?? "Not recorded",
            ],
            ["Franchise expiry", formatDate(profile?.franchise?.expiresAt)],
          ].map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
          <Pressable
            style={commonStyles.button}
            onPress={() => {
              setPhone(profile?.phone ?? "+63");
              setMode("phone");
            }}
          >
            <Text style={commonStyles.buttonText}>Edit phone number</Text>
          </Pressable>
        </View>
        {violations.length > 0 && (
          <View style={styles.group}>
            <Text style={commonStyles.sectionTitle}>Violation records</Text>
            {violations.map((item) => (
              <View key={item.id} style={[commonStyles.card, styles.violation]}>
                <Text style={styles.violationTitle}>
                  {titleCase(item.category)} · {titleCase(item.status)}
                </Text>
                <Text style={styles.violationMeta}>{item.description}</Text>
                <Text style={styles.violationMeta}>
                  {titleCase(item.offenseLevel)} · {formatDate(item.occurredAt)}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Pressable
          style={commonStyles.secondaryButton}
          onPress={() => setMode("password")}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.ink} />
          <Text style={commonStyles.secondaryButtonText}>Change password</Text>
        </Pressable>
        <Pressable
          style={commonStyles.secondaryButton}
          onPress={() => setPolicyOpen(true)}
        >
          <Ionicons name="document-outline" size={18} color={colors.ink} />
          <Text style={commonStyles.secondaryButtonText}>
            Terms and privacy
          </Text>
        </Pressable>
        <Pressable
          style={commonStyles.secondaryButton}
          onPress={() => void logout()}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.dangerText}>Sign out</Text>
        </Pressable>
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
                {mode === "phone" ? "Update phone" : "Change password"}
              </Text>
              <Pressable onPress={() => setMode(null)}>
                <Ionicons name="close" size={25} color={colors.ink} />
              </Pressable>
            </View>
            {mode === "phone" ? (
              <>
                <TextInput
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+639XXXXXXXXX"
                  style={commonStyles.input}
                />
                <Pressable
                  style={commonStyles.button}
                  onPress={() => void savePhone()}
                >
                  <Text style={commonStyles.buttonText}>Save number</Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  secureTextEntry
                  value={password.current}
                  onChangeText={(current) =>
                    setPassword((value) => ({ ...value, current }))
                  }
                  placeholder="Current password"
                  style={commonStyles.input}
                />
                <TextInput
                  secureTextEntry
                  value={password.next}
                  onChangeText={(next) =>
                    setPassword((value) => ({ ...value, next }))
                  }
                  placeholder="New password"
                  style={commonStyles.input}
                />
                <TextInput
                  secureTextEntry
                  value={password.confirm}
                  onChangeText={(confirm) =>
                    setPassword((value) => ({ ...value, confirm }))
                  }
                  placeholder="Confirm new password"
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
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
