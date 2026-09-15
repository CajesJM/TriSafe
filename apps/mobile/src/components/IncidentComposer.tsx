import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { PassengerIncident } from "../models/trisafe";
import { trisafeApi } from "../services/trisafeApi";
import { useToast } from "../context/ToastContext";
import { commonStyles } from "../style/shared/common.styles";
import { colors } from "../style/shared/theme";
import { incidentComposerStyles as styles } from "../style/passenger/incidentComposer.styles";
import { titleCase } from "../utils/format";

const categories = ["SAFETY", "OVERCHARGING", "HARASSMENT", "VEHICLE", "OTHER"];

export function IncidentComposer({
  visible,
  rideId,
  incident,
  onClose,
  onSaved,
}: {
  visible: boolean;
  rideId?: string;
  incident?: PassengerIncident | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [category, setCategory] = useState("SAFETY");
  const [description, setDescription] = useState("");
  const [evidenceData, setEvidenceData] = useState<string>();
  const [evidenceName, setEvidenceName] = useState<string>();
  const [draft, setDraft] = useState<PassengerIncident | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCategory(incident?.category ?? "SAFETY");
    setDescription(incident?.rawDescription ?? "");
    setDraft(incident ?? null);
    setEvidenceData(undefined);
    setEvidenceName(incident?.evidence?.[0]?.fileName);
  }, [incident, visible]);

  async function pickEvidence() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return showToast("Photo access is required to attach evidence.", "error");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.55,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (!asset?.base64) return;
    const mime =
      asset.mimeType && /image\/(jpeg|jpg|png|webp)/i.test(asset.mimeType)
        ? asset.mimeType
        : "image/jpeg";
    setEvidenceData(`data:${mime};base64,${asset.base64}`);
    setEvidenceName(asset.fileName ?? "incident-evidence.jpg");
  }

  async function save(submit: boolean) {
    if (description.trim().length < 10)
      return showToast(
        "Describe the incident using at least 10 characters.",
        "error",
      );
    setBusy(true);
    try {
      const saved = draft?.id
        ? await trisafeApi.updateIncidentDraft(draft.id, {
            rawDescription: description,
            category,
            evidenceData,
            evidenceName,
          })
        : await trisafeApi.draftIncident({
            rawDescription: description,
            category,
            rideId,
            evidenceData,
            evidenceName,
          });
      setDraft(saved);
      if (submit)
        await trisafeApi.submitIncident(
          saved.id,
          saved.aiDraft ?? description,
          category,
        );
      showToast(
        submit
          ? "Incident report submitted to the LGU."
          : "Private draft saved.",
        "success",
      );
      onSaved();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Report could not be saved.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={commonStyles.rowBetween}>
              <View>
                <Text style={commonStyles.eyebrow}>Passenger safety</Text>
                <Text style={styles.title}>Report an incident</Text>
              </View>
              <Pressable accessibilityLabel="Close" onPress={onClose}>
                <Ionicons name="close" size={25} color={colors.ink} />
              </Pressable>
            </View>
            <Text style={commonStyles.body}>
              Provide factual information. AI creates a clearer draft, but only
              authorized LGU reviewers decide the outcome.
            </Text>
            <View style={styles.categories}>
              {categories.map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.category,
                    category === item && styles.categoryActive,
                  ]}
                  onPress={() => setCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === item && styles.categoryTextActive,
                    ]}
                  >
                    {titleCase(item)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              multiline
              maxLength={4000}
              value={description}
              onChangeText={setDescription}
              placeholder="Explain what happened, where it occurred, and relevant vehicle or driver details…"
              placeholderTextColor={colors.subtle}
              style={[commonStyles.input, styles.description]}
            />
            <Pressable
              style={styles.evidence}
              onPress={() => void pickEvidence()}
            >
              <Ionicons
                name="image-outline"
                size={22}
                color={colors.limeDark}
              />
              <Text style={styles.evidenceText}>
                {evidenceName ?? "Attach one optional evidence photo"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
            {draft?.aiDraft && (
              <View style={styles.preview}>
                <Text style={styles.previewText}>{draft.aiDraft}</Text>
              </View>
            )}
            {busy ? (
              <ActivityIndicator color={colors.limeDark} />
            ) : (
              <View style={styles.actions}>
                <Pressable
                  style={[commonStyles.secondaryButton, styles.action]}
                  onPress={() => void save(false)}
                >
                  <Text style={commonStyles.secondaryButtonText}>
                    Save draft
                  </Text>
                </Pressable>
                <Pressable
                  style={[commonStyles.button, styles.action]}
                  onPress={() => void save(true)}
                >
                  <Text style={commonStyles.buttonText}>Submit report</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
