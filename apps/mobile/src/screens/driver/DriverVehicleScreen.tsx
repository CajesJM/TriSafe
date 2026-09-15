import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useDriver } from "../../context/DriverContext";
import type { DriverVehicle } from "../../models/trisafe";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { driverVehicleStyles as styles } from "../../style/driver/driverVehicleScreen.styles";
import { titleCase } from "../../utils/format";

export function DriverVehicleScreen() {
  const navigation = useNavigation();
  const { profile, loading, refresh } = useDriver();
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
        <ScreenHeader
          eyebrow="LGU vehicle registry"
          title="Vehicle information"
          subtitle="View vehicles officially registered under your driver account."
        />
        {profile?.vehicles.length ? (
          profile.vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onQr={() =>
                navigation.dispatch(CommonActions.navigate({ name: "QR" }))
              }
            />
          ))
        ) : (
          <View style={commonStyles.empty}>
            <Ionicons
              name="car-sport-outline"
              size={38}
              color={colors.subtle}
            />
            <Text style={commonStyles.sectionTitle}>No registered vehicle</Text>
            <Text style={commonStyles.body}>
              Contact the LGU transport office for assistance.
            </Text>
          </View>
        )}
        <View style={styles.notice}>
          <Ionicons name="business-outline" size={21} color={colors.limeDark} />
          <Text style={styles.noticeText}>
            Vehicle identity and registration details are LGU-managed. Contact
            the transport office if a record is incorrect.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
function VehicleCard({
  vehicle,
  onQr,
}: {
  vehicle: DriverVehicle;
  onQr: () => void;
}) {
  const rows = [
    ["Vehicle type", titleCase(vehicle.vehicleType)],
    [
      vehicle.vehicleType === "HABAL_HABAL" ? "Permit number" : "Body number",
      vehicle.permitNumber ?? vehicle.bodyNumber ?? "Not recorded",
    ],
    ["Engine number", vehicle.engineNumber ?? "Not recorded"],
    ["Chassis number", vehicle.chassisNumber ?? "Not recorded"],
    ["Plate number", vehicle.plateNumber],
    [
      "LGU QR status",
      !vehicle.qrCode
        ? "Not generated"
        : vehicle.qrCode.revokedAt
          ? "Revoked"
          : "Generated and active",
    ],
  ];
  return (
    <View style={[commonStyles.card, styles.card]}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons
            name={
              vehicle.vehicleType === "HABAL_HABAL" ? "bicycle" : "car-sport"
            }
            size={27}
            color={colors.lime}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.plate}>{vehicle.plateNumber}</Text>
          <Text style={styles.type}>{titleCase(vehicle.vehicleType)}</Text>
        </View>
        <View
          style={[styles.status, !vehicle.isActive && styles.statusInactive]}
        >
          <Text style={styles.statusText}>
            {vehicle.isActive ? "ACTIVE" : "INACTIVE"}
          </Text>
        </View>
      </View>
      <View style={commonStyles.divider} />
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
      <Pressable
        disabled={!vehicle.qrCode}
        style={[commonStyles.button, !vehicle.qrCode && styles.disabled]}
        onPress={onQr}
      >
        <Ionicons name="qr-code" size={19} color={colors.ink} />
        <Text style={commonStyles.buttonText}>View official QR code</Text>
      </Pressable>
    </View>
  );
}
