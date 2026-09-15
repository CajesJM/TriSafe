import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { DriverProvider } from "../context/DriverContext";
import { DriverHomeScreen } from "../screens/driver/DriverHomeScreen";
import { DriverVehicleScreen } from "../screens/driver/DriverVehicleScreen";
import { DriverQrScreen } from "../screens/driver/DriverQrScreen";
import { DriverAnnouncementsScreen } from "../screens/driver/DriverAnnouncementsScreen";
import { DriverProfileScreen } from "../screens/driver/DriverProfileScreen";
import { colors } from "../style/shared/theme";
import { navigationStyles } from "../style/shared/navigation.styles";

export type DriverTabParamList = {
  Home: undefined;
  Vehicle: undefined;
  QR: undefined;
  Updates: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator<DriverTabParamList>();
export function DriverNavigator() {
  return (
    <DriverProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.lime,
          tabBarInactiveTintColor: "#AEB7B1",
          tabBarStyle: navigationStyles.bar,
          tabBarLabelStyle: navigationStyles.label,
          tabBarIcon: ({ color, size }) => {
            const icons = {
              Home: "grid",
              Vehicle: "car-sport-outline",
              QR: "qr-code",
              Updates: "megaphone-outline",
              Profile: "person-outline",
            } as const;
            return (
              <Ionicons
                name={icons[route.name]}
                size={route.name === "QR" ? 24 : size}
                color={route.name === "QR" ? colors.ink : color}
              />
            );
          },
          tabBarIconStyle:
            route.name === "QR" ? navigationStyles.scanButton : undefined,
        })}
      >
        <Tab.Screen name="Home" component={DriverHomeScreen} />
        <Tab.Screen name="Vehicle" component={DriverVehicleScreen} />
        <Tab.Screen name="QR" component={DriverQrScreen} />
        <Tab.Screen name="Updates" component={DriverAnnouncementsScreen} />
        <Tab.Screen name="Profile" component={DriverProfileScreen} />
      </Tab.Navigator>
    </DriverProvider>
  );
}
