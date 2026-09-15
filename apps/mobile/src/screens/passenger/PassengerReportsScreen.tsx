import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ScreenHeader } from "../../components/ScreenHeader";
import { IncidentComposer } from "../../components/IncidentComposer";
import { usePassenger } from "../../context/PassengerContext";
import type { PassengerIncident } from "../../models/trisafe";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { passengerSafetyStyles as styles } from "../../style/passenger/passengerSafetyScreens.styles";
import { formatDate, titleCase } from "../../utils/format";

export function PassengerReportsScreen() {
  const navigation = useNavigation();
  const { incidents, loading, refresh } = usePassenger();
  const [editing, setEditing] = useState<PassengerIncident | "new" | null>(
    null,
  );
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
          eyebrow="Authorized LGU review"
          title="Report history"
          subtitle="Review private drafts, submitted reports, and official statuses."
          onBack={() => navigation.goBack()}
          action={{
            icon: "add",
            label: "New report",
            onPress: () => setEditing("new"),
          }}
        />
        {incidents.length ? (
          incidents.map((incident) => (
            <Pressable
              key={incident.id}
              disabled={incident.status !== "DRAFT"}
              style={[commonStyles.card, styles.item]}
              onPress={() => setEditing(incident)}
            >
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle}>
                  {titleCase(incident.category)}
                </Text>
                <View
                  style={[
                    commonStyles.badge,
                    incident.status === "DRAFT" && styles.badgeDraft,
                  ]}
                >
                  <Text style={commonStyles.badgeText}>
                    {titleCase(incident.status)}
                  </Text>
                </View>
              </View>
              <Text numberOfLines={3} style={styles.itemText}>
                {incident.finalDescription ??
                  incident.aiDraft ??
                  incident.rawDescription}
              </Text>
              <Text style={styles.itemText}>
                {formatDate(incident.submittedAt ?? incident.createdAt)}
                {incident.evidence?.length ? " · Evidence attached" : ""}
              </Text>
              {incident.reviewerNotes && (
                <Text style={styles.itemText}>
                  LGU note: {incident.reviewerNotes}
                </Text>
              )}
            </Pressable>
          ))
        ) : (
          <View style={commonStyles.empty}>
            <Ionicons
              name="document-text-outline"
              size={36}
              color={colors.subtle}
            />
            <Text style={commonStyles.sectionTitle}>No incident reports</Text>
            <Text style={commonStyles.body}>
              Your saved drafts and submitted reports will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
      <IncidentComposer
        visible={Boolean(editing)}
        incident={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => void refresh()}
      />
    </View>
  );
}
