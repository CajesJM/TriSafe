import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AccountType } from "../../models/trisafe";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { commonStyles } from "../../style/shared/common.styles";
import { loginStyles } from "../../style/auth/loginScreen.styles";
import { colors } from "../../style/shared/theme";
import { trisafeApi } from "../../services/trisafeApi";

export function LoginScreen() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [accountType, setAccountType] = useState<AccountType>("PASSENGER");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!identifier.trim() || !password) {
      showToast("Enter your username or email and password.", "error");
      return;
    }
    if (accountType === "PASSENGER" && password.length < 8) {
      showToast(
        "Passenger passwords must contain at least 8 characters.",
        "error",
      );
      return;
    }
    setLoading(true);
    try {
      await login(identifier, password, accountType);
      showToast("Signed in successfully.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Sign in failed.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={loginStyles.screen}
    >
      <ScrollView
        contentContainerStyle={loginStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={loginStyles.brand}>
          <View style={loginStyles.logo}>
            <Ionicons name="shield-checkmark" size={34} color={colors.lime} />
          </View>
          <Text style={loginStyles.brandName}>
            Tri<Text style={loginStyles.brandAccent}>Safe</Text>
          </Text>
          <Text style={loginStyles.subtitle}>
            Verified transport and safer journeys
          </Text>
        </View>

        <View style={loginStyles.card}>
          <Text style={loginStyles.heading}>Welcome back</Text>
          <Text style={loginStyles.helper}>
            Select your account type and enter your TriSafe credentials.
          </Text>

          <View style={loginStyles.selector}>
            {(["PASSENGER", "DRIVER"] as const).map((type) => {
              const active = type === accountType;
              return (
                <Pressable
                  key={type}
                  onPress={() => setAccountType(type)}
                  style={[
                    loginStyles.selectorButton,
                    active && loginStyles.selectorActive,
                  ]}
                >
                  <Ionicons
                    name={type === "PASSENGER" ? "person" : "car-sport"}
                    size={17}
                    color={active ? colors.limeDark : colors.muted}
                  />
                  <Text
                    style={[
                      loginStyles.selectorText,
                      active && loginStyles.selectorTextActive,
                    ]}
                  >
                    {type === "PASSENGER" ? "Passenger" : "Driver"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={loginStyles.field}>
            <Text style={commonStyles.label}>
              {accountType === "DRIVER"
                ? "Username or email"
                : "Username or email"}
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setIdentifier}
              placeholder={
                accountType === "DRIVER"
                  ? "lastname.firstname"
                  : "Passenger username or email"
              }
              placeholderTextColor={colors.subtle}
              returnKeyType="next"
              style={commonStyles.input}
              value={identifier}
            />
          </View>
          <View style={loginStyles.field}>
            <Text style={commonStyles.label}>Password</Text>
            <View style={loginStyles.passwordWrap}>
              <TextInput
                onChangeText={setPassword}
                onSubmitEditing={submit}
                placeholder={
                  accountType === "DRIVER"
                    ? "Body or permit number"
                    : "Enter your password"
                }
                placeholderTextColor={colors.subtle}
                returnKeyType="done"
                secureTextEntry={!passwordVisible}
                style={[commonStyles.input, loginStyles.passwordInput]}
                value={password}
              />
              <Pressable
                accessibilityLabel={
                  passwordVisible ? "Hide password" : "Show password"
                }
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={loginStyles.eyeButton}
              >
                <Ionicons
                  name={passwordVisible ? "eye-off" : "eye"}
                  size={19}
                  color={colors.muted}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            disabled={loading}
            onPress={submit}
            style={[
              commonStyles.button,
              loginStyles.button,
              loading && { opacity: 0.65 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Text style={commonStyles.buttonText}>Sign in securely</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.ink} />
              </>
            )}
          </Pressable>
          <Text style={loginStyles.apiHint}>API: {trisafeApi.baseUrl}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
