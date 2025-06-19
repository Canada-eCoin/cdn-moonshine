import React, {memo, useState, useRef, useEffect} from "react";
import {
	StyleSheet,
	View,
	Text,
	Platform
} from "react-native";
import PropTypes from "prop-types";
import {
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner
} from 'react-native-vision-camera';
import { systemWeights } from "react-native-typography";
import EvilIcon from "react-native-vector-icons/EvilIcons";
import XButton from "./XButton";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

interface CameraComponent {
	onBarCodeRead: Function,
	onClose: Function
}
const _Camera = ({ onBarCodeRead = () => null, onClose = () => null }: CameraComponent) => {
	const [_data, setData] = useState("");
	const camera = useRef(null);
	const { hasPermission, requestPermission } = useCameraPermission();
	const device = useCameraDevice('back');

	useEffect(() => {
		// Request camera permission if it hasn't been granted
		if (!hasPermission) {
			requestPermission();
		}
	}, [hasPermission, requestPermission]);

	const codeScanner = useCodeScanner({
		codeTypes: ['qr', 'ean-13', 'code-128'],
		onCodeScanned: (codes) => {
			if (codes.length > 0 && _data !== codes[0].value) {
				setData(codes[0].value);
				onBarCodeRead(codes[0].value);
			}
		}
	});

	if (!hasPermission) {
		return (
			<View style={styles.notAuthorizedView}>
				<EvilIcon name={"exclamation"} size={60} />
				<Text style={[styles.boldText, { marginVertical: 10 }]}>It appears I do not have permission to access your camera.</Text>
				<Text style={styles.text}>To utilize this feature in the future you will need to enable camera permissions for this app from your phones settings.</Text>
			</View>
		);
	}

	if (!device) {
		return (
			<View style={styles.notAuthorizedView}>
				<EvilIcon name={"exclamation"} size={60} />
				<Text style={[styles.boldText, { marginVertical: 10 }]}>No camera device is available</Text>
				<Text style={styles.text}>Please check your device and try again.</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<VisionCamera
				ref={camera}
				style={styles.container}
				device={device}
				isActive={true}
				codeScanner={codeScanner}
				video={false}
				audio={false}
				onError={() => {
					alert("There was an error encountered when loading the camera. Please ensure the app has permission to use this feature in your phone settings.");
					onClose();
				}}
			/>
			<View style={styles.xButton}>
				<XButton onPress={onClose} />
			</View>
		</View>
	);
};

_Camera.propTypes = {
	onBarCodeRead: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#eee",
		zIndex: 999
	},
	notAuthorizedView: {
		flex: 1,
		top: -40,
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 20
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: 10,
		zIndex: 1000
	},
	text: {
		...systemWeights.regular,
		fontSize: 18,
		textAlign: "center"
	},
	boldText: {
		...systemWeights.bold,
		fontSize: 18,
		textAlign: "center"
	},
});

//ComponentShouldNotUpdate
const Camera = memo(
	_Camera,
	() => true
);

export default Camera;

