/**
 * Renders whatever src/utils/notify raised. Mounted once, above App, in Root.js.
 *
 * Banners sit at the top of the screen and auto-dismiss; they never block. The confirm
 * modal is a promise-bridge for the two or three places that need a decision, and it
 * resolves false on backdrop press or Android back so a caller can never hang.
 */
import React, { useEffect, useRef, useState } from "react";
import { Modal, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { subscribe } from "../utils/notify";

const COLORS = {
	background: "#241733",
	border: "#4b2f66",
	text: "#ffffff",
	info: "#8b6fd6",
	success: "#4caf7d",
	warning: "#e0a83a",
	error: "#e05a4f",
	button: "#8b6fd6",
};

// Offset the banner below the status bar without pulling in safe-area-context. The app
// never ran edge-to-edge before the 0.88 upgrade; it does now, so the inset matters.
const TOP_OFFSET = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 56;

const NotifyHost = () => {
	const [banners, setBanners] = useState([]);
	const [prompt, setPrompt] = useState(null);
	const timers = useRef(new Map());

	const remove = (id) => {
		const timer = timers.current.get(id);
		if (timer) {
			clearTimeout(timer);
			timers.current.delete(id);
		}
		setBanners((current) => current.filter((banner) => banner.id !== id));
	};

	useEffect(() => {
		const unsubscribe = subscribe((event) => {
			if (event.type === "dismiss") {
				remove(event.id);
				return;
			}
			if (event.type === "confirm") {
				setPrompt(event);
				return;
			}
			if (event.type === "notify") {
				setBanners((current) => [...current, event]);
				timers.current.set(event.id, setTimeout(() => remove(event.id), event.timeout));
			}
		});
		return () => {
			unsubscribe();
			timers.current.forEach((timer) => clearTimeout(timer));
			timers.current.clear();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const settle = (value) => {
		if (!prompt) return;
		try {
			prompt.resolve(value);
		} catch (e) {}
		setPrompt(null);
	};

	return (
		<View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="notify-host">
			<View pointerEvents="box-none" style={[styles.stack, { top: TOP_OFFSET }]}>
				{banners.map((banner) => (
					<TouchableOpacity
						key={banner.id}
						activeOpacity={0.9}
						onPress={() => remove(banner.id)}
						accessibilityRole="alert"
						accessibilityLabel={banner.message}
						testID={`notify-${banner.level}`}
						style={[styles.banner, { borderLeftColor: COLORS[banner.level] || COLORS.info }]}
					>
						<Text style={styles.bannerText}>{banner.message}</Text>
					</TouchableOpacity>
				))}
			</View>

			<Modal
				visible={!!prompt}
				transparent
				animationType="fade"
				onRequestClose={() => settle(false)}
			>
				<View style={styles.backdrop}>
					<View style={styles.card} testID="notify-confirm">
						<Text style={styles.cardText}>{prompt ? prompt.message : ""}</Text>
						<View style={styles.buttons}>
							{prompt && prompt.cancelText ? (
								<TouchableOpacity style={styles.button} onPress={() => settle(false)}>
									<Text style={styles.buttonText}>{prompt.cancelText}</Text>
								</TouchableOpacity>
							) : null}
							<TouchableOpacity
								style={[styles.button, styles.buttonPrimary, prompt && prompt.destructive ? styles.buttonDestructive : null]}
								onPress={() => settle(true)}
							>
								<Text style={styles.buttonText}>{prompt ? prompt.confirmText : "OK"}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	stack: { position: "absolute", left: 8, right: 8 },
	banner: {
		backgroundColor: COLORS.background,
		borderColor: COLORS.border,
		borderLeftWidth: 4,
		borderRadius: 6,
		borderWidth: 1,
		elevation: 12,
		marginBottom: 8,
		paddingHorizontal: 14,
		paddingVertical: 11,
	},
	bannerText: { color: COLORS.text, fontSize: 14, lineHeight: 19 },
	backdrop: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", flex: 1, justifyContent: "center", padding: 24 },
	card: { backgroundColor: COLORS.background, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, padding: 20, width: "100%" },
	cardText: { color: COLORS.text, fontSize: 15, lineHeight: 21, marginBottom: 18 },
	buttons: { flexDirection: "row", justifyContent: "flex-end" },
	button: { borderRadius: 6, marginLeft: 10, paddingHorizontal: 16, paddingVertical: 10 },
	buttonPrimary: { backgroundColor: COLORS.button },
	buttonDestructive: { backgroundColor: COLORS.error },
	buttonText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
});

export default NotifyHost;
