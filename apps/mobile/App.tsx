import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ToastProvider } from "./src/context/ToastContext";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { LoadingScreen } from "./src/components/LoadingScreen";
import { PassengerNavigator } from "./src/navigation/PassengerNavigator";
import { DriverNavigator } from "./src/navigation/DriverNavigator";
import { colors } from "./src/style/shared/theme";
import { commonStyles } from "./src/style/shared/common.styles";

function AppContent() {
  const { user, restoring } = useAuth();
  if (restoring) return <LoadingScreen label="Restoring secure session…" />;
  if (!user) return <LoginScreen />;
  return user.role === "DRIVER" ? <DriverNavigator /> : <PassengerNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <NavigationContainer
            theme={{
              ...DefaultTheme,
              colors: { ...DefaultTheme.colors, background: colors.canvas },
            }}
          >
            <StatusBar style="dark" />
            <SafeAreaView edges={["top"]} style={commonStyles.safeArea}>
              <AppContent />
            </SafeAreaView>
          </NavigationContainer>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
