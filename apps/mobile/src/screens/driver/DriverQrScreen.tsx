import { useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useDriver } from "../../context/DriverContext";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { driverQrStyles as styles } from "../../style/driver/driverQrScreen.styles";
import { formatDate } from "../../utils/format";

export function DriverQrScreen() {
  const { profile } = useDriver();
  const [selected, setSelected] = useState(0);
  const vehicles = profile?.vehicles ?? [];
  const vehicle = vehicles[selected];
  const qr = vehicle?.qrCode;
  const franchise = profile?.franchise;
  const eligible = Boolean(
    vehicle?.isActive &&
    qr &&
    !qr.revokedAt &&
    profile?.verification === "VERIFIED" &&
    profile.accountStatus === "ACTIVE" &&
    franchise?.status === "VERIFIED" &&
    new Date(franchise.expiresAt) > new Date(),
  );
  return (
    <View style={commonStyles.screen}>
      <ScrollView contentContainerStyle={commonStyles.scrollContent}>
        <ScreenHeader
          eyebrow="Passenger verification"
          title="My LGU QR code"
          subtitle="Show this code so passengers can verify your driver, vehicle, and franchise records."
        />
        {vehicles.length > 1 && (
          <View style={styles.selector}>
            {vehicles.map((item, index) => (
              <Pressable
                key={item.id}
                style={[
                  styles.selectorItem,
                  index === selected && styles.selectorActive,
                ]}
                onPress={() => setSelected(index)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    index === selected && styles.selectorTextActive,
                  ]}
                >
                  {item.plateNumber}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {vehicle && qr ? (
          <View style={styles.card}>
            <View style={styles.top}>
              <View>
                <Text style={styles.eyebrow}>OFFICIAL LGU-ISSUED QR</Text>
                <Text style={styles.plate}>{vehicle.plateNumber}</Text>
              </View>
              <View style={[styles.badge, !eligible && styles.badgeInactive]}>
                <Text style={styles.badgeText}>
                  {eligible ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>
            </View>
            <View style={styles.qr}>
              <QRCode
                value={`trisafe://verify/${qr.token}`}
                size={240}
                color={colors.ink}
                backgroundColor={colors.surface}
              />
            </View>
            <Text style={styles.explanation}>
              {eligible
                ? "Ask the passenger to scan before starting the ride."
                : inactiveReason(
                    profile?.verification,
                    profile?.accountStatus,
                    vehicle.isActive,
                    qr.revokedAt,
                    franchise?.status,
                    franchise?.expiresAt,
                  )}
            </Text>
            <Text style={styles.generated}>
              Generated {formatDate(qr.generatedAt)}
            </Text>
          </View>
        ) : (
          <View style={commonStyles.empty}>
            <Ionicons name="qr-code-outline" size={44} color={colors.subtle} />
            <Text style={commonStyles.sectionTitle}>No QR code assigned</Text>
            <Text style={commonStyles.body}>
              Contact the LGU transport office for assistance.
            </Text>
          </View>
        )}
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            This backup QR display is view-only. Only an authorized LGU
            administrator can generate, replace, revoke, or download the
            official QR.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
function inactiveReason(
  verification?: string,
  account?: string,
  vehicleActive?: boolean,
  revokedAt?: string | null,
  franchiseStatus?: string,
  expiresAt?: string,
) {
  if (revokedAt) return "This QR code was revoked by the LGU.";
  if (!vehicleActive) return "This vehicle is inactive.";
  if (account !== "ACTIVE") return "Your driver account is inactive.";
  if (verification !== "VERIFIED")
    return `Driver verification is ${verification?.toLowerCase() ?? "incomplete"}.`;
  if (expiresAt && new Date(expiresAt) <= new Date())
    return "Your franchise has expired.";
  if (franchiseStatus !== "VERIFIED")
    return `Franchise status is ${franchiseStatus?.toLowerCase() ?? "unavailable"}.`;
  return "This QR is not eligible for verified rides.";
}
