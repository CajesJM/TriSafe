import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TermsDocument } from "../models/trisafe";
import { trisafeApi } from "../services/trisafeApi";
import { commonStyles } from "../style/shared/common.styles";
import { policyModalStyles as styles } from "../style/shared/policyModal.styles";
import { colors } from "../style/shared/theme";
import { formatDate } from "../utils/format";

export function PolicyModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [document, setDocument] = useState<TermsDocument | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    trisafeApi
      .currentTerms()
      .then(setDocument)
      .catch(() => setDocument(null))
      .finally(() => setLoading(false));
  }, [visible]);
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={commonStyles.rowBetween}>
              <View>
                <Text style={commonStyles.eyebrow}>Official policy</Text>
                <Text style={styles.title}>
                  {document?.title ?? "Terms and privacy"}
                </Text>
              </View>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={25} color={colors.ink} />
              </Pressable>
            </View>
            {loading ? (
              <ActivityIndicator color={colors.limeDark} />
            ) : (
              <>
                <Text style={styles.body}>
                  {document?.content ??
                    "No published terms document is currently available."}
                </Text>
                {document && (
                  <Text style={styles.meta}>
                    Version {document.version} · Effective{" "}
                    {formatDate(document.effectiveFrom ?? document.publishedAt)}
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
