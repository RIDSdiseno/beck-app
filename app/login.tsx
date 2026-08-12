import { loginWithEmailPassword } from "@/services/api/authApi";
import { clearMisObrasCache } from "@/services/api/obrasApi";
import { clearMisRegistrosCache } from "@/services/api/registrosApi";
import {
  getMicrosoftAuthRequestConfig,
  getMicrosoftRedirectUri,
  isMicrosoftConfigured,
  microsoftDiscovery,
} from "@/services/auth/microsoft";
import { getInitialRouteForRole } from "@/services/auth/roles";
import {
  saveMicrosoftAuthState,
  saveSession,
} from "@/services/auth/session";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  HelperText,
  Text,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { TextInput } from "@/components/AppTextInput";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Se habilitará cuando las pruebas se realicen con un development build de EAS.
const MICROSOFT_LOGIN_ENABLED = false;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const activeInputRef = useRef<"email" | "password" | null>(null);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [error, setError] = useState("");
  const [empresa, setEmpresa] = useState<"beck" | "firemat">("beck");
  const isFiremat = empresa === "firemat";
  const redirectUri = useMemo(() => getMicrosoftRedirectUri(), []);
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    getMicrosoftAuthRequestConfig(redirectUri),
    microsoftDiscovery,
  );

  const onInputFocus = (inputName: "email" | "password") => {
    activeInputRef.current = inputName;
    setIsInputFocused(true);
  };

  const onInputBlur = (inputName: "email" | "password") => {
    setTimeout(() => {
      if (activeInputRef.current !== inputName) return;

      activeInputRef.current = null;
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setIsInputFocused(false);
    }, 80);
  };

  const onMicrosoftLogin = async () => {
    if (!MICROSOFT_LOGIN_ENABLED) return;

    try {
      setError("");
      setIsMicrosoftLoading(true);

      if (!isMicrosoftConfigured()) {
        throw new Error("El acceso con Microsoft aún no está configurado.");
      }

      const codeVerifier = request?.codeVerifier ?? "";

      if (!codeVerifier) {
        throw new Error("No se pudo preparar el acceso con Microsoft.");
      }

      await saveMicrosoftAuthState(codeVerifier, redirectUri);
      const result = await promptAsync();

      if (result.type === "success") {
        router.replace({
          pathname: "/auth",
          params: result.params,
        });
        return;
      }

      if (result.type === "error") {
        setError(result.error?.message || "Microsoft no completó el login.");
      }
    } catch (err: unknown) {
      if (__DEV__) console.warn("PROMPT MICROSOFT ERROR", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir el login de Microsoft.",
      );
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  const onEmailLogin = async () => {
    try {
      setError("");

      if (!isValidEmail(email)) {
        setError("Correo no válido.");
        return;
      }

      setIsEmailLoading(true);

      const data = await loginWithEmailPassword(email, password, empresa);
      clearMisObrasCache();
      clearMisRegistrosCache();
      await saveSession(data.token, data.user);
      router.replace(getInitialRouteForRole(data.user.rol));
    } catch (err: any) {
      setError(err?.message || "No se pudo iniciar sesión.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const isLoading = isMicrosoftLoading || isEmailLoading;
  const hasEmailValue = Boolean(email.trim());
  const hasEmailError = hasEmailValue && !isValidEmail(email);
  const isEmailLoginDisabled =
    isLoading || !email.trim() || hasEmailError || !password;
  const isMicrosoftLoginDisabled =
    !MICROSOFT_LOGIN_ENABLED || !request || isLoading;
  const isAndroid = Platform.OS === "android";
  const isShortAndroid = isAndroid && screenHeight < 740;
  const keyboardBehavior = isInputFocused
    ? Platform.OS === "ios"
      ? "padding"
      : "height"
    : undefined;
  const topInset = isAndroid
    ? Math.max(insets.top, 12)
    : insets.top + 24;
  const bottomInset = isAndroid
    ? Math.max(insets.bottom, 72)
    : insets.bottom + 28;

  return (
    <View style={[styles.background, isFiremat && styles.firematBackground]}>
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={keyboardBehavior}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 16}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: topInset,
                paddingBottom: bottomInset,
              },
            ]}
            scrollEnabled={isInputFocused}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.container,
                isAndroid && styles.androidContainer,
              ]}
            >
              <View
                style={[
                  styles.logoContainer,
                  isAndroid && styles.androidLogoContainer,
                  isShortAndroid && styles.shortAndroidLogoContainer,
                ]}
              >
                <Image
                  source={
                    isFiremat
                      ? require("../assets/images/Firemat_logo.png")
                      : require("../assets/images/beck-splash-logo.png")
                  }
                  style={[
                    styles.logo,
                    isFiremat && styles.firematLogo,
                    isAndroid && styles.androidLogo,
                    isShortAndroid && styles.shortAndroidLogo,
                  ]}
                  resizeMode="contain"
                />
              </View>

              <Card
                style={[styles.card, isAndroid && styles.androidCard]}
                elevation={3}
              >
                <Card.Content>
                  <Text style={[styles.eyebrow, isFiremat && styles.firematEyebrow]}>
                    {isFiremat ? "FIREMAT" : "CRM BECK"}
                  </Text>

                  <Text
                    variant="headlineMedium"
                    style={[styles.title, isAndroid && styles.androidTitle]}
                  >
                    Iniciar sesión
                  </Text>

                  <Text
                    style={[
                      styles.subtitle,
                      isAndroid && styles.androidSubtitle,
                    ]}
                  >
                    Accede con las credenciales asignadas desde el CRM {isFiremat ? "Firemat" : "Beck"}
                  </Text>

                  <TextInput
                    mode="outlined"
                    label="Correo"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    disabled={isLoading}
                    error={hasEmailError}
                    dense={isAndroid}
                    onFocus={() => onInputFocus("email")}
                    onBlur={() => onInputBlur("email")}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                  />
                  <HelperText
                    type="error"
                    visible={hasEmailError}
                    style={styles.helperText}
                  >
                    Correo no válido.
                  </HelperText>

                  <TextInput
                    mode="outlined"
                    label="Contraseña"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    disabled={isLoading}
                    dense={isAndroid}
                    onFocus={() => onInputFocus("password")}
                    onBlur={() => onInputBlur("password")}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? "eye-off" : "eye"}
                        onPress={() => setShowPassword((value) => !value)}
                        forceTextInputFocus={false}
                      />
                    }
                  />

                  <Button
                    mode="contained"
                    icon="email-outline"
                    onPress={onEmailLogin}
                    loading={isEmailLoading}
                    disabled={isEmailLoginDisabled}
                    style={[
                      styles.button,
                      isFiremat && styles.firematButton,
                      isFiremat && isEmailLoginDisabled && styles.firematButtonDisabled,
                    ]}
                    buttonColor={isFiremat ? "#f20d13" : "#f97316"}
                    textColor="#ffffff"
                    contentStyle={[
                      styles.buttonContent,
                      isAndroid && styles.androidButtonContent,
                    ]}
                    labelStyle={styles.buttonLabel}
                  >
                    {isEmailLoading ? "Ingresando..." : "Ingresar"}
                  </Button>

                  <View
                    style={[
                      styles.dividerRow,
                      isAndroid && styles.androidDividerRow,
                    ]}
                  >
                    <Divider style={styles.divider} />
                    <Text style={styles.dividerText}>o</Text>
                    <Divider style={styles.divider} />
                  </View>

                  <Button
                    mode="contained"
                    icon="microsoft-windows"
                    onPress={onMicrosoftLogin}
                    loading={isMicrosoftLoading}
                    disabled={isMicrosoftLoginDisabled}
                    style={[
                      styles.microsoftButton,
                      isFiremat && styles.firematButton,
                      isFiremat && isMicrosoftLoginDisabled && styles.firematButtonDisabled,
                    ]}
                    buttonColor={isFiremat ? "#f20d13" : "#334155"}
                    textColor="#ffffff"
                    contentStyle={[
                      styles.buttonContent,
                      isAndroid && styles.androidButtonContent,
                    ]}
                    labelStyle={styles.buttonLabel}
                  >
                    Acceso Microsoft próximamente
                  </Button>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </Card.Content>
              </Card>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFiremat ? "Volver al acceso Beck" : "Ir al acceso Firemat"}
          hitSlop={12}
          style={({ pressed }) => [
            styles.companySwitch,
            {
              top: Math.max(insets.top, 12),
              backgroundColor: isFiremat ? "#FDC10B" : "#111827",
            },
            pressed && styles.companySwitchPressed,
          ]}
          onPress={() => {
            setEmpresa(isFiremat ? "beck" : "firemat");
            setError("");
          }}
        >
          {isFiremat ? (
            <Text style={styles.beckSwitchLetter}>B</Text>
          ) : (
            <MaterialCommunityIcons name="fire" size={28} color="#ef4444" />
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#FDC10B",
  },
  firematBackground: {
    backgroundColor: "#090909",
  },
  companySwitch: {
    position: "absolute",
    right: 14,
    zIndex: 100,
    elevation: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  companySwitchPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  beckSwitchLetter: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 56,
  },
  androidContainer: {
    justifyContent: "center",
    paddingBottom: 0,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  androidLogoContainer: {
    marginBottom: 16,
  },
  shortAndroidLogoContainer: {
    marginBottom: 10,
  },
  logo: {
    alignSelf: "center",
    height: 250,
    maxWidth: 500,
    width: "100%",
  },
  firematLogo: {
    transform: [{ translateX: 12 }],
  },
  androidLogo: {
    height: 235,
    maxWidth: 480,
  },
  shortAndroidLogo: {
    height: 194,
    maxWidth: 410,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 0,
    paddingVertical: 6,
  },
  androidCard: {
    borderRadius: 18,
    paddingVertical: 0,
  },
  eyebrow: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#1a1a1a",
    marginBottom: 8,
  },
  firematEyebrow: {
    color: "#dc2626",
  },
  title: {
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 8,
  },
  androidTitle: {
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 6,
  },
  subtitle: {
    textAlign: "center",
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  androidSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  input: {
    backgroundColor: "#ffffff",
  },
  helperText: {
    marginBottom: 2,
    marginTop: -4,
  },
  inputOutline: {
    borderRadius: 12,
  },
  button: {
    backgroundColor: "#f97316",
    borderRadius: 14,
    marginTop: 4,
  },
  buttonContent: {
    minHeight: 52,
  },
  androidButtonContent: {
    minHeight: 46,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  androidDividerRow: {
    marginVertical: 14,
  },
  divider: {
    flex: 1,
    backgroundColor: "#cbd5e1",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#64748b",
    fontSize: 13,
  },
  microsoftButton: {
    backgroundColor: "#334155",
    borderRadius: 14,
  },
  firematButton: {
    backgroundColor: "#f20d13",
  },
  firematButtonDisabled: {
    opacity: 0.55,
  },
  errorText: {
    marginTop: 14,
    textAlign: "center",
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
});
