import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../components/ScreenHeader";
import { IncidentComposer } from "../../components/IncidentComposer";
import { usePassenger } from "../../context/PassengerContext";
import { useToast } from "../../context/ToastContext";
import type { Ride } from "../../models/trisafe";
import { trisafeApi } from "../../services/trisafeApi";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { passengerRidesStyles as styles } from "../../style/passenger/passengerRidesScreen.styles";
import { formatDate, money, rideFare, titleCase } from "../../utils/format";

export function PassengerRidesScreen() {
  const { rides, loading, refresh } = usePassenger();
  const { showToast } = useToast();
  const [filter, setFilter] = useState("ALL");
  const [reportRide, setReportRide] = useState<Ride | null>(null);
  const [ratingRide, setRatingRide] = useState<Ride | null>(null);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const filtered = useMemo(
    () =>
      filter === "ALL" ? rides : rides.filter((ride) => ride.status === filter),
    [filter, rides],
  );

  async function rate() {
    if (!ratingRide) return;
    try {
      await trisafeApi.createRating(ratingRide.id, score, comment);
      showToast("Thank you. Your rating was submitted.", "success");
      setRatingRide(null);
      setComment("");
      await refresh();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Rating failed.",
        "error",
      );
    }
  }

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
          eyebrow="Journey records"
          title="Your rides"
          subtitle="Review completed and active verified transport sessions."
        />
        <View style={styles.filter}>
          {["ALL", "ACTIVE", "COMPLETED", "CANCELLED"].map((item) => (
            <Pressable
              key={item}
              style={[
                styles.filterItem,
                filter === item && styles.filterActive,
              ]}
              onPress={() => setFilter(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item && styles.filterTextActive,
                ]}
              >
                {titleCase(item)}
              </Text>
            </Pressable>
          ))}
        </View>
        {loading && !rides.length ? (
          <ActivityIndicator color={colors.limeDark} />
        ) : filtered.length ? (
          filtered.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              onRate={() => {
                setRatingRide(ride);
                setScore(ride.rating?.score ?? 5);
              }}
              onReport={() => setReportRide(ride)}
            />
          ))
        ) : (
          <View style={commonStyles.empty}>
            <Ionicons
              name="trail-sign-outline"
              size={34}
              color={colors.subtle}
            />
            <Text style={commonStyles.sectionTitle}>No rides here</Text>
            <Text style={commonStyles.body}>
              Verified rides will appear after they are started.
            </Text>
          </View>
        )}
      </ScrollView>
      <IncidentComposer
        visible={Boolean(reportRide)}
        rideId={reportRide?.id}
        onClose={() => setReportRide(null)}
        onSaved={() => void refresh()}
      />
      <Modal
        transparent
        animationType="fade"
        visible={Boolean(ratingRide)}
        onRequestClose={() => setRatingRide(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[commonStyles.card, styles.modalCard]}>
            <Text style={commonStyles.sectionTitle}>Rate this driver</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setScore(value)}>
                  <Ionicons
                    name={value <= score ? "star" : "star-outline"}
                    size={31}
                    color="#E5A800"
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              multiline
              placeholder="Optional comment"
              style={[commonStyles.input, styles.comment]}
            />
            <Pressable style={commonStyles.button} onPress={() => void rate()}>
              <Text style={commonStyles.buttonText}>Submit rating</Text>
            </Pressable>
            <Pressable
              style={commonStyles.secondaryButton}
              onPress={() => setRatingRide(null)}
            >
              <Text style={commonStyles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RideCard({
  ride,
  onRate,
  onReport,
}: {
  ride: Ride;
  onRate: () => void;
  onReport: () => void;
}) {
  const driver =
    ride.operatorName ??
    ride.vehicle?.driver?.user?.fullName ??
    "Verified driver";
  return (
    <View style={[commonStyles.card, styles.ride]}>
      <View style={styles.rideTop}>
        <View>
          <Text style={styles.driver}>{driver}</Text>
          <Text style={styles.meta}>
            {formatDate(ride.startedAt)} · {titleCase(ride.status)}
          </Text>
        </View>
        <Text style={styles.fare}>{money(rideFare(ride))}</Text>
      </View>
      <View style={styles.route}>
        <View style={styles.routeLine}>
          <Ionicons name="radio-button-on" size={12} color={colors.limeDark} />
          <View style={styles.routeStroke} />
          <Ionicons name="location" size={14} color={colors.danger} />
        </View>
        <View style={styles.routeText}>
          <Text style={styles.place}>
            {ride.fromLocationName ?? "Recorded origin"}
          </Text>
          <Text style={styles.place}>
            {ride.toLocationName ?? "Recorded destination"}
          </Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        {ride.status === "COMPLETED" && !ride.rating && (
          <Pressable
            style={[commonStyles.secondaryButton, styles.smallAction]}
            onPress={onRate}
          >
            <Ionicons name="star-outline" size={17} color={colors.ink} />
            <Text style={commonStyles.secondaryButtonText}>Rate</Text>
          </Pressable>
        )}
        <Pressable
          style={[commonStyles.secondaryButton, styles.smallAction]}
          onPress={onReport}
        >
          <Ionicons name="flag-outline" size={17} color={colors.ink} />
          <Text style={commonStyles.secondaryButtonText}>Report</Text>
        </Pressable>
      </View>
    </View>
  );
}
