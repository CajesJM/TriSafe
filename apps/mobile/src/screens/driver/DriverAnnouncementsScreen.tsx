import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useDriver } from "../../context/DriverContext";
import type { DriverAnnouncement } from "../../models/trisafe";
import { commonStyles } from "../../style/shared/common.styles";
import { colors } from "../../style/shared/theme";
import { driverAnnouncementsStyles as styles } from "../../style/driver/driverAnnouncementsScreen.styles";
import { formatDate } from "../../utils/format";

export function DriverAnnouncementsScreen() {
  const { announcements, loading, refresh, readAnnouncement } = useDriver();
  const [selected, setSelected] = useState<DriverAnnouncement | null>(null);
  async function open(item: DriverAnnouncement) {
    setSelected(item);
    if (!item.readAt) await readAnnouncement(item.id);
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
          eyebrow="LGU communications"
          title="Announcements"
          subtitle="Read official transport notices and renewal information."
          action={{
            icon: "megaphone-outline",
            label: "Unread announcements",
            badge: announcements.filter((item) => !item.readAt).length,
            onPress: () => undefined,
          }}
        />
        {announcements.length ? (
          announcements.map((item) => (
            <Pressable
              key={item.id}
              style={[
                commonStyles.card,
                styles.card,
                !item.readAt && styles.unread,
              ]}
              onPress={() => void open(item)}
            >
              <View style={styles.icon}>
                <Ionicons
                  name="megaphone-outline"
                  size={21}
                  color={colors.limeDark}
                />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{item.title}</Text>
                  {!item.readAt && <View style={styles.dot} />}
                </View>
                {item.imageData && (
                  <Image
                    source={{ uri: item.imageData }}
                    style={styles.image}
                  />
                )}
                <Text numberOfLines={2} style={styles.body}>
                  {item.body}
                </Text>
                <Text style={styles.date}>
                  Published {formatDate(item.publishedAt)}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={commonStyles.empty}>
            <Ionicons
              name="megaphone-outline"
              size={40}
              color={colors.subtle}
            />
            <Text style={commonStyles.sectionTitle}>
              No active announcements
            </Text>
            <Text style={commonStyles.body}>
              New LGU notices will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
      <Modal
        transparent
        animationType="slide"
        visible={Boolean(selected)}
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.detail}>
            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.eyebrow}>Official LGU notice</Text>
              <Pressable onPress={() => setSelected(null)}>
                <Ionicons name="close" size={25} color={colors.ink} />
              </Pressable>
            </View>
            <Text style={styles.detailTitle}>{selected?.title}</Text>
            {selected?.imageData && (
              <Image
                source={{ uri: selected.imageData }}
                style={styles.image}
              />
            )}
            <Text style={styles.detailBody}>{selected?.body}</Text>
            <Text style={styles.date}>
              Published {formatDate(selected?.publishedAt)}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
