/**
 * Biometric prompt adapter.
 *
 * The app was written against react-native-touch-id, which is unmaintained and cannot
 * compile against Android SDK 37 any more: it talks to `FingerprintManager`, which the
 * SDK no longer ships. react-native-biometrics wraps `androidx.biometric.BiometricPrompt`
 * instead. Its API is a different shape (isSensorAvailable / simplePrompt), so this
 * module keeps the two calls the app actually makes — isSupported() and authenticate() —
 * and nothing else in the app had to change.
 *
 * isSupported() resolves to "FaceID" or "TouchID" like the old library did, and rejects
 * when no biometric hardware is enrolled. authenticate() resolves on success and rejects
 * on cancel/failure, which is what the retry-button logic in App.js keys off.
 */
import ReactNativeBiometrics, { BiometryTypes } from "react-native-biometrics";

const biometrics = new ReactNativeBiometrics();

const isSupported = async () => {
	const { available, biometryType } = await biometrics.isSensorAvailable();
	if (!available) throw new Error("Biometrics not available");
	return biometryType === BiometryTypes.FaceID ? "FaceID" : "TouchID";
};

const authenticate = async (reason = "Authenticate") => {
	const { success } = await biometrics.simplePrompt({ promptMessage: reason });
	if (!success) throw new Error("Biometric authentication failed");
	return true;
};

export default { isSupported, authenticate };
export { isSupported, authenticate };
