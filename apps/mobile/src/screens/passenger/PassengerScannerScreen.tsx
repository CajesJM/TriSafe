import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { usePassenger } from "../../context/PassengerContext";
import { useToast } from "../../context/ToastContext";
import type { QrVerificationResult } from "../../models/trisafe";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { passengerScannerStyles as styles } from "../../style/passenger/passengerScannerScreen.styles";

function parseToken(raw: string) {
  const value = raw.trim();
  const match = /^trisafe:\/\/verify\/([^/?#]+)$/i.exec(value);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function PassengerScannerScreen() {
  const navigation = useNavigation();
  const { verifyQr } = usePassenger();
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<QrVerificationResult | null>(null);

  useEffect(() => {
    if (!permission) void requestPermission();
  }, [permission, requestPermission]);

  async function scan(event: BarcodeScanningResult) {
    if (locked) return;
    setLocked(true);
    const token = parseToken(event.data);
    if (!token) {
      showToast("This is not an official TriSafe QR code.", "error");
      setTimeout(() => setLocked(false), 1200);
      return;
    }
    try {
      setResult(await verifyQr(token));
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "QR verification failed.",
        "error",
      );
      setLocked(false);
    }
  }

  if (!permission?.granted)
    return (
      <View style={styles.permission}>
        <Ionicons name="camera-outline" size={42} color={colors.limeDark} />
        <Text style={commonStyles.title}>Camera access</Text>
        <Text style={[commonStyles.body, { textAlign: "center" }]}>
          TriSafe needs the camera only to scan official vehicle QR codes.
        </Text>
        <Pressable
          style={commonStyles.button}
          onPress={() => void requestPermission()}
        >
          <Text style={commonStyles.buttonText}>Allow camera</Text>
        </Pressable>
      </View>
    );

  const vehicle = result?.vehicle;
  return (
    <View style={styles.screen}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={locked ? undefined : scan}
      />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.intro}>
          <Text style={styles.title}>Verify your ride</Text>
          <Text style={styles.subtitle}>
            Center the official TriSafe QR inside the frame before entering the
            vehicle.
          </Text>
        </View>
        <View style={styles.frame} />
        <Text style={styles.hint}>Scanning securely…</Text>
      </View>
      <Modal
        transparent
        animationType="slide"
        visible={Boolean(result)}
        onRequestClose={() => {
          setResult(null);
          setLocked(false);
        }}
      >
        <View style={styles.resultBackdrop}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultIcon}>
                <Ionicons
                  name={
                    result?.eligibleForRide ? "shield-checkmark" : "warning"
                  }
                  size={25}
                  color={
                    result?.eligibleForRide ? colors.limeDark : colors.danger
                  }
                />
              </View>
              <Text style={styles.resultTitle}>
                {result?.eligibleForRide
                  ? "Verified TriSafe vehicle"
                  : "Ride not approved"}
              </Text>
            </View>
            <Text style={styles.resultMessage}>{result?.message}</Text>
            {vehicle && (
              <View style={styles.detailGrid}>
                <Detail label="Driver" value={vehicle.driverName} />
                <Detail
                  label="Operator"
                  value={vehicle.ownerName ?? "Not listed"}
                />
                <Detail
                  label="Identifier"
                  value={vehicle.bodyNumber ?? vehicle.plateNumber}
                />
                <Detail
                  label="Rating"
                  value={
                    vehicle.averageRating
                      ? `${vehicle.averageRating.toFixed(1)} (${vehicle.ratingCount})`
                      : "No ratings"
                  }
                />
                <Detail
                  label="Vehicle"
                  value={vehicle.vehicleType.replaceAll("_", "-")}
                />
                <Detail
                  label="Status"
                  value={result?.transportStatus ?? "Unknown"}
                />
              </View>
            )}
            <View style={styles.actions}>
              <Pressable
                style={[commonStyles.secondaryButton, styles.action]}
                onPress={() => {
                  setResult(null);
                  setLocked(false);
                }}
              >
                <Text style={commonStyles.secondaryButtonText}>Scan again</Text>
              </Pressable>
              {result?.eligibleForRide && (
                <Pressable
                  style={[commonStyles.button, styles.action]}
                  onPress={() => {
                    setResult(null);
                    navigation.dispatch(
                      CommonActions.navigate({ name: "Fare" }),
                    );
                  }}
                >
                  <Text style={commonStyles.buttonText}>Continue to fare</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}
