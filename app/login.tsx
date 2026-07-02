import {
  getMicrosoftAuthRequestConfig,
  getMicrosoftRedirectUri,
  microsoftDiscovery,
} from "@/services/auth/microsoft";
import { loginWithEmailPassword } from "@/services/api/authApi";
import { clearMisObrasCache } from "@/services/api/obrasApi";
import { clearMisRegistrosCache } from "@/services/api/registrosApi";
import { getInitialRouteForRole } from "@/services/auth/roles";
import {
  saveMicrosoftAuthState,
  saveSession,
} from "@/services/auth/session";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
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
  TextInput,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const BECK_EMAIL_DOMAIN = "@becksoluciones.cl";

function isBeckEmail(value: string) {
  return value.toLowerCase().trim().endsWith(BECK_EMAIL_DOMAIN);
}

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
    try {
      setError("");
      setIsMicrosoftLoading(true);

      const codeVerifier = request?.codeVerifier ?? "";

      if (!codeVerifier) {
        throw new Error("No se pudo obtener el code_verifier.");
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

      setIsMicrosoftLoading(false);
    } catch (err: any) {
      if (__DEV__) console.warn("PROMPT MICROSOFT ERROR", err);
      setError(err?.message || "No se pudo abrir el login de Microsoft.");
      setIsMicrosoftLoading(false);
    }
  };

  const onEmailLogin = async () => {
    try {
      setError("");

      if (!isBeckEmail(email)) {
        setError("Correo no válido.");
        return;
      }

      setIsEmailLoading(true);

      const data = await loginWithEmailPassword(email, password);
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
  const hasEmailDomainError = hasEmailValue && !isBeckEmail(email);
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
    <ImageBackground
      source={require("../assets/images/login-fire-bg.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

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
                  source={require("../assets/images/logo_beck.png")}
                  style={[
                    styles.logo,
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
                  <Text style={styles.eyebrow}>CRM BECK</Text>

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
                    Accede con tu cuenta corporativa Microsoft o con tus
                    credenciales Beck
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
                    error={hasEmailDomainError}
                    dense={isAndroid}
                    onFocus={() => onInputFocus("email")}
                    onBlur={() => onInputBlur("email")}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                  />
                  <HelperText
                    type="error"
                    visible={hasEmailDomainError}
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
                    disabled={
                      isLoading ||
                      !email.trim() ||
                      hasEmailDomainError ||
                      !password
                    }
                    style={styles.button}
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
                    disabled={!request || isLoading}
                    style={styles.microsoftButton}
                    contentStyle={[
                      styles.buttonContent,
                      isAndroid && styles.androidButtonContent,
                    ]}
                    labelStyle={styles.buttonLabel}
                  >
                    {isMicrosoftLoading
                      ? "Conectando..."
                      : "Continuar con Microsoft"}
                  </Button>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </Card.Content>
              </Card>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
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
  androidLogo: {
    height: 235,
    maxWidth: 480,
  },
  shortAndroidLogo: {
    height: 194,
    maxWidth: 410,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.93)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
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
    color: "#f97316",
    marginBottom: 8,
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
  microsoftButton: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
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
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginVertical: 18,
  },
  androidDividerRow: {
    marginVertical: 12,
  },
  divider: {
    flex: 1,
    backgroundColor: "#cbd5e1",
  },
  dividerText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 14,
    textAlign: "center",
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
});
