import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  type MapPressEvent,
  type Region,
} from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import type {
  Coordinate,
  FareEstimate,
  PassengerFareType,
} from "../../models/trisafe";
import { trisafeApi } from "../../services/trisafeApi";
import { usePassenger } from "../../context/PassengerContext";
import { useToast } from "../../context/ToastContext";
import { ScreenHeader } from "../../components/ScreenHeader";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { passengerFareStyles as styles } from "../../style/passenger/passengerFareScreen.styles";
import { asNumber, money } from "../../utils/format";

const fallback: Region = {
  latitude: 10.0793,
  longitude: 124.3434,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};
const fareTypes: { label: string; value: PassengerFareType }[] = [
  { label: "Regular", value: "REGULAR" },
  { label: "Student", value: "STUDENT" },
  { label: "Senior", value: "SENIOR_CITIZEN" },
];

export function PassengerFareScreen() {
  const { verifiedRide, activeRide, latestLocation, setActiveRide } =
    usePassenger();
  const { showToast } = useToast();
  const [origin, setOrigin] = useState<Coordinate | null>(null);
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [originName, setOriginName] = useState("Current location");
  const [destinationName, setDestinationName] = useState(
    "Tap the map to choose a destination",
  );
  const [passengerType, setPassengerType] =
    useState<PassengerFareType>("REGULAR");
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function locate() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        return showToast(
          "Location permission is required for road-distance fares.",
          "error",
        );
      const point = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coordinate = {
        latitude: point.coords.latitude,
        longitude: point.coords.longitude,
      };
      setOrigin(coordinate);
      try {
        setOriginName(
          (
            await trisafeApi.fareLocationName(
              coordinate.latitude,
              coordinate.longitude,
            )
          ).name,
        );
      } catch {
        /* coordinate remains authoritative */
      }
    }
    void locate();
  }, [showToast]);

  useEffect(() => {
    if (destination) void calculate(destination);
    // Passenger type intentionally recalculates the official fare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passengerType]);

  async function calculate(point: Coordinate) {
    if (!origin) return showToast("Waiting for your current location.", "info");
    const vehicleType = verifiedRide?.result.vehicle?.vehicleType ?? "TRICYCLE";
    setBusy(true);
    try {
      const [nextEstimate, place] = await Promise.all([
        trisafeApi.estimateDistanceFare({
          vehicleType,
          passengerType,
          originLatitude: origin.latitude,
          originLongitude: origin.longitude,
          destinationLatitude: point.latitude,
          destinationLongitude: point.longitude,
        }),
        trisafeApi
          .fareLocationName(point.latitude, point.longitude)
          .catch(() => ({ name: "Selected destination", context: "" })),
      ]);
      setDestination(point);
      setEstimate(nextEstimate);
      setDestinationName(place.name);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Fare estimate failed.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function selectDestination(event: MapPressEvent) {
    void calculate(event.nativeEvent.coordinate);
  }

  async function start() {
    const vehicle = verifiedRide?.result.vehicle;
    if (!verifiedRide || !vehicle)
      return showToast(
        "Scan and verify a driver QR before starting a ride.",
        "error",
      );
    if (!origin || !destination || !estimate)
      return showToast(
        "Choose a destination and calculate the fare first.",
        "error",
      );
    setBusy(true);
    try {
      const ride = await trisafeApi.startRide({
        vehicleId: vehicle.vehicleId,
        qrToken: verifiedRide.token,
        originLatitude: origin.latitude,
        originLongitude: origin.longitude,
        destinationLatitude: destination.latitude,
        destinationLongitude: destination.longitude,
        originLocationName: originName,
        destinationLocationName: destinationName,
        passengerType,
        passengerCount: 1,
      });
      setActiveRide(ride);
      showToast(
        "Verified ride started. Live safety tracking is active.",
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Ride could not be started.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!activeRide) return;
    setBusy(true);
    try {
      const point = latestLocation?.coords ?? origin;
      await trisafeApi.endRide(
        activeRide.id,
        point?.latitude,
        point?.longitude,
      );
      setActiveRide(null);
      showToast("Ride completed and saved to your history.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Ride could not be ended.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  const region = origin
    ? { ...origin, latitudeDelta: 0.035, longitudeDelta: 0.035 }
    : fallback;
  return (
    <View style={commonStyles.screen}>
      <ScreenHeader
        eyebrow="Official fare"
        title="Road-distance estimate"
        subtitle="Select your destination to calculate the LGU fare."
      />
      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeRide && (
          <View style={[commonStyles.card, styles.active]}>
            <Text style={commonStyles.eyebrow}>Ride in progress</Text>
            <Text style={styles.activeFare}>
              {money(
                asNumber(
                  typeof activeRide.currentFare === "object"
                    ? activeRide.currentFare?.amount
                    : activeRide.currentFare,
                ) || asNumber(activeRide.estimatedFare),
              )}
            </Text>
            <Text style={commonStyles.body}>
              {Math.round(asNumber(activeRide.actualDistanceMeters))} m tracked
              securely
            </Text>
            <Pressable
              disabled={busy}
              style={[commonStyles.button, busy && styles.disabled]}
              onPress={() => void end()}
            >
              <Text style={commonStyles.buttonText}>End ride</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.map}>
          <MapView
            style={styles.mapCanvas}
            initialRegion={region}
            region={origin ? region : undefined}
            onPress={selectDestination}
            showsUserLocation
          >
            {origin && (
              <Marker
                coordinate={origin}
                title="Your location"
                pinColor={colors.limeDark}
              />
            )}
            {destination && (
              <Marker coordinate={destination} title="Destination" />
            )}
            {estimate?.routeCoordinates?.length ? (
              <Polyline
                coordinates={estimate.routeCoordinates}
                strokeColor={colors.ink}
                strokeWidth={5}
              />
            ) : null}
          </MapView>
          <Text pointerEvents="none" style={styles.mapHint}>
            Tap anywhere on the map to set your destination
          </Text>
        </View>
        <View style={[commonStyles.card, styles.panel]}>
          <View style={styles.place}>
            <Ionicons
              name="navigate-circle"
              size={22}
              color={colors.limeDark}
            />
            <Text style={styles.placeText}>{originName}</Text>
          </View>
          <View style={styles.place}>
            <Ionicons name="location" size={22} color={colors.danger} />
            <Text style={styles.placeText}>{destinationName}</Text>
          </View>
          <View style={styles.segmented}>
            {fareTypes.map((item) => (
              <Pressable
                key={item.value}
                style={[
                  styles.segment,
                  passengerType === item.value && styles.segmentActive,
                ]}
                onPress={() => setPassengerType(item.value)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    passengerType === item.value && styles.segmentTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {verifiedRide?.result.vehicle && (
          <View style={styles.verified}>
            <Ionicons
              name="shield-checkmark"
              size={23}
              color={colors.limeDark}
            />
            <Text style={styles.verifiedText}>
              {verifiedRide.result.vehicle.driverName} ·{" "}
              {verifiedRide.result.vehicle.plateNumber} is verified for this
              estimate.
            </Text>
          </View>
        )}
        {busy && <ActivityIndicator color={colors.limeDark} />}
        {estimate && (
          <View style={styles.estimate}>
            <View style={styles.estimateTop}>
              <View>
                <Text style={styles.estimateLabel}>
                  Estimated official fare
                </Text>
                <Text style={styles.estimateFare}>
                  {money(estimate.amount)}
                </Text>
              </View>
              <Text style={styles.estimateDistance}>
                {estimate.distanceKm?.toFixed(2)} km
              </Text>
            </View>
            <Text style={styles.estimateMeta}>
              Base {money(estimate.baseFare)} · Distance{" "}
              {money(estimate.distanceCharge)} · {estimate.discountPercent}%
              discount
            </Text>
            <Text style={styles.estimateMeta}>{estimate.disclaimer}</Text>
            <Pressable
              disabled={busy || Boolean(activeRide)}
              style={[
                commonStyles.button,
                (busy || Boolean(activeRide)) && styles.disabled,
              ]}
              onPress={() => void start()}
            >
              <Text style={commonStyles.buttonText}>
                {verifiedRide
                  ? "Start verified ride"
                  : "Scan QR before starting"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
