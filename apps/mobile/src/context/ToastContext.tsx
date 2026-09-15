import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Animated, PanResponder, Text, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toastStyles } from "../style/shared/toast.styles";
import { colors } from "../style/shared/theme";

type ToastType = "success" | "error" | "info";
type ToastState = { id: number; message: string; type: ToastType };
type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -8,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  useEffect(() => {
    if (!toast) return;
    translateX.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [dismiss, opacity, toast, translateX, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6,
      onPanResponderMove: (_, gesture) => translateX.setValue(gesture.dx),
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > 80) dismiss();
        else
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
      },
    }),
  ).current;

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({ id: Date.now(), message, type });
  }, []);

  const icon =
    toast?.type === "success"
      ? "checkmark-circle"
      : toast?.type === "error"
        ? "alert-circle"
        : "information-circle";
  const iconColor =
    toast?.type === "success"
      ? colors.forest
      : toast?.type === "error"
        ? colors.danger
        : colors.info;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={toastStyles.host}>
          <Animated.View
            {...panResponder.panHandlers}
            key={toast.id}
            style={[
              toastStyles.toast,
              toastStyles[toast.type],
              { opacity, transform: [{ translateY }, { translateX }] },
            ]}
          >
            <View style={toastStyles.icon}>
              <Ionicons name={icon} size={19} color={iconColor} />
            </View>
            <View style={toastStyles.copy}>
              <Text style={toastStyles.title}>
                {toast.type === "success"
                  ? "Success"
                  : toast.type === "error"
                    ? "Unable to continue"
                    : "TriSafe"}
              </Text>
              <Text style={toastStyles.message}>{toast.message}</Text>
            </View>
            <Pressable
              accessibilityLabel="Dismiss notification"
              onPress={dismiss}
              style={toastStyles.close}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
