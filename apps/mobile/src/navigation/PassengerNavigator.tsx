import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PassengerProvider } from "../context/PassengerContext";
import { PassengerHomeScreen } from "../screens/passenger/PassengerHomeScreen";
import { PassengerFareScreen } from "../screens/passenger/PassengerFareScreen";
import { PassengerScannerScreen } from "../screens/passenger/PassengerScannerScreen";
import { PassengerRidesScreen } from "../screens/passenger/PassengerRidesScreen";
import { PassengerProfileScreen } from "../screens/passenger/PassengerProfileScreen";
import { PassengerTrustedContactsScreen } from "../screens/passenger/PassengerTrustedContactsScreen";
import { PassengerReportsScreen } from "../screens/passenger/PassengerReportsScreen";
import { colors } from "../style/shared/theme";
import { navigationStyles } from "../style/shared/navigation.styles";

export type PassengerTabParamList = {
  Home: undefined;
  Fare: undefined;
  Scan: undefined;
  Rides: undefined;
  Profile: undefined;
};
export type PassengerStackParamList = {
  PassengerTabs: { initialTab?: keyof PassengerTabParamList } | undefined;
  TrustedContacts: undefined;
  Reports: undefined;
};
const Tab = createBottomTabNavigator<PassengerTabParamList>();
const Stack = createNativeStackNavigator<PassengerStackParamList>();

function PassengerTabs({
  route,
}: {
  route: { params?: { initialTab?: keyof PassengerTabParamList } };
}) {
  return (
    <Tab.Navigator
      initialRouteName={route.params?.initialTab ?? "Home"}
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: "#AEB7B1",
        tabBarStyle: navigationStyles.bar,
        tabBarLabelStyle: navigationStyles.label,
        tabBarIcon: ({ color, size }) => {
          const names = {
            Home: "grid",
            Fare: "cash",
            Scan: "qr-code",
            Rides: "git-branch",
            Profile: "person-outline",
          } as const;
          return (
            <Ionicons
              name={names[tabRoute.name]}
              color={tabRoute.name === "Scan" ? colors.ink : color}
              size={tabRoute.name === "Scan" ? 24 : size}
            />
          );
        },
        tabBarIconStyle:
          tabRoute.name === "Scan" ? navigationStyles.scanButton : undefined,
      })}
    >
      <Tab.Screen name="Home" component={PassengerHomeScreen} />
      <Tab.Screen name="Fare" component={PassengerFareScreen} />
      <Tab.Screen name="Scan" component={PassengerScannerScreen} />
      <Tab.Screen name="Rides" component={PassengerRidesScreen} />
      <Tab.Screen name="Profile" component={PassengerProfileScreen} />
    </Tab.Navigator>
  );
}

export function PassengerNavigator() {
  return (
    <PassengerProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PassengerTabs" component={PassengerTabs} />
        <Stack.Screen
          name="TrustedContacts"
          component={PassengerTrustedContactsScreen}
        />
        <Stack.Screen name="Reports" component={PassengerReportsScreen} />
      </Stack.Navigator>
    </PassengerProvider>
  );
}
