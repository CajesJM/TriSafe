import { useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ScreenHeader } from "../../components/ScreenHeader";
import { usePassenger } from "../../context/PassengerContext";
import { useToast } from "../../context/ToastContext";
import type { TrustedContact } from "../../models/trisafe";
import { trisafeApi } from "../../services/trisafeApi";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { passengerSafetyStyles as styles } from "../../style/passenger/passengerSafetyScreens.styles";

const empty = { fullName: "", relationship: "", phone: "+63", active: true };

export function PassengerTrustedContactsScreen() {
  const navigation = useNavigation();
  const { contacts, loading, refresh } = usePassenger();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<TrustedContact | "new" | null>(null);
  const [form, setForm] = useState(empty);

  function open(contact?: TrustedContact) {
    setEditing(contact ?? "new");
    setForm(
      contact
        ? {
            fullName: contact.fullName,
            relationship: contact.relationship,
            phone: contact.phone,
            active: contact.active,
          }
        : empty,
    );
  }
  async function save() {
    if (!/^\+63\d{10}$/.test(form.phone))
      return showToast(
        "Use a Philippine number in +63XXXXXXXXXX format.",
        "error",
      );
    try {
      await trisafeApi.saveTrustedContact({
        ...form,
        id: editing !== "new" ? editing?.id : undefined,
      });
      showToast("Trusted contact saved.", "success");
      setEditing(null);
      await refresh();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Contact could not be saved.",
        "error",
      );
    }
  }
  async function remove() {
    if (!editing || editing === "new") return;
    try {
      await trisafeApi.deleteTrustedContact(editing.id);
      showToast("Trusted contact removed.", "success");
      setEditing(null);
      await refresh();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Contact could not be removed.",
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
          eyebrow="SafeShare & SOS"
          title="Trusted contacts"
          subtitle="Choose people who may receive your verified ride details."
          onBack={() => navigation.goBack()}
          action={{ icon: "add", label: "Add contact", onPress: () => open() }}
        />
        {contacts.length ? (
          contacts.map((contact) => (
            <Pressable
              key={contact.id}
              style={[commonStyles.card, styles.item]}
              onPress={() => open(contact)}
            >
              <View style={styles.itemTop}>
                <View>
                  <Text style={styles.itemTitle}>{contact.fullName}</Text>
                  <Text style={styles.itemText}>
                    {contact.relationship} · {contact.phone}
                  </Text>
                </View>
                <Ionicons
                  name={
                    contact.active ? "checkmark-circle" : "pause-circle-outline"
                  }
                  size={22}
                  color={contact.active ? colors.limeDark : colors.muted}
                />
              </View>
            </Pressable>
          ))
        ) : (
          <View style={commonStyles.empty}>
            <Ionicons name="people-outline" size={36} color={colors.subtle} />
            <Text style={commonStyles.sectionTitle}>No trusted contacts</Text>
            <Text style={commonStyles.body}>
              Add at least one contact before your next trip.
            </Text>
          </View>
        )}
      </ScrollView>
      <Modal
        transparent
        animationType="slide"
        visible={Boolean(editing)}
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={commonStyles.rowBetween}>
              <Text style={styles.sheetTitle}>
                {editing === "new" ? "Add contact" : "Edit contact"}
              </Text>
              <Pressable onPress={() => setEditing(null)}>
                <Ionicons name="close" size={25} color={colors.ink} />
              </Pressable>
            </View>
            <TextInput
              placeholder="Full name"
              value={form.fullName}
              onChangeText={(fullName) =>
                setForm((value) => ({ ...value, fullName }))
              }
              style={commonStyles.input}
            />
            <TextInput
              placeholder="Relationship"
              value={form.relationship}
              onChangeText={(relationship) =>
                setForm((value) => ({ ...value, relationship }))
              }
              style={commonStyles.input}
            />
            <TextInput
              placeholder="+639XXXXXXXXX"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(phone) =>
                setForm((value) => ({ ...value, phone }))
              }
              style={commonStyles.input}
            />
            <View style={styles.switchRow}>
              <Text style={commonStyles.secondaryButtonText}>
                Available for safety alerts
              </Text>
              <Switch
                value={form.active}
                onValueChange={(active) =>
                  setForm((value) => ({ ...value, active }))
                }
                trackColor={{ true: colors.limeDark }}
              />
            </View>
            <Pressable style={commonStyles.button} onPress={() => void save()}>
              <Text style={commonStyles.buttonText}>Save contact</Text>
            </Pressable>
            {editing !== "new" && (
              <Pressable
                style={commonStyles.secondaryButton}
                onPress={() => void remove()}
              >
                <Text style={styles.dangerText}>Remove contact</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
