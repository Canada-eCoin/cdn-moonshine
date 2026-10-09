import React, { useEffect, memo } from "react";
import {
	StyleSheet,
	View,
	LayoutAnimation,
	Platform,
	Dimensions,
	PixelRatio
} from "react-native";
import { systemWeights } from "react-native-typography";
import {
	TouchableOpacity,
	TouchableHighlight,
	EvilIcon,
	Text
} from "../styles/components";
const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
  width: SCREEN_WIDTH,
} = Dimensions.get('window');

// based on iphone 5s's scale
const scale = SCREEN_WIDTH / 320;

export function normalize(size) {
  const newSize = size * scale 
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize))
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2
  }
}

const ROW_HEIGHT = normalize(32);


interface CameraComponent {
	onSendPress: Function,
	onReceivePress: Function,
	onCameraPress: Function,
	style?: object
}

const {
	getCoinData
} = require("../utils/networks");

const _CameraRow = ({ onSendPress = () => null, onReceivePress = () => null, onCameraPress = () => null, style = {}, coin }: CameraComponent) => {
	
	useEffect(() => {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	});
	
	const _onSendPress = () => onSendPress();
	const _onCameraPress = () => onCameraPress();
	const _onReceivePress = () => onReceivePress();

	let brandStyle = {
		backgroundColor: `${getCoinData({ selectedCrypto:coin }).color}aa`,
		borderColor: `${getCoinData({ selectedCrypto:coin }).color}`,
	}

	return (
		<View style={[styles.container, style]}>
			<TouchableOpacity type="background" onPress={_onSendPress} style={{...styles.leftItem, ...brandStyle}}>
				<Text type="text" style={styles.text}>Send</Text>
			</TouchableOpacity>
			<View style={styles.centerItem}>
				<TouchableHighlight 
					onPress={_onCameraPress} 
					underlayColor={colors.background} 
					style={{...styles.cameraIcon, 
						backgroundColor: `${getCoinData({ selectedCrypto:coin }).color}`,
						borderColor: `${getCoinData({ selectedCrypto:coin }).color}99`
					}}
				>
					<EvilIcon style={{ color: "#FFF", bottom: 0, left: 0.3 }} name={"camera"} size={normalize(48)} />
				</TouchableHighlight>
			</View>
			<TouchableOpacity type="background" onPress={_onReceivePress} style={{...styles.rightItem, ...brandStyle}}>
				<Text type="text" style={styles.text}>Receive</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems:"center",
	},
	leftItem: {
		flex: 1,
		alignItems:"center",
		justifyContent:"center",
		paddingVertical: 5,
		borderWidth: 2,
		borderRadius: 50,
		borderTopRightRadius: 0,
		borderBottomRightRadius: 0,
		height: ROW_HEIGHT,
		right: -20
	},
	centerItem: {
		zIndex: 10,
		alignItems:"center",
		justifyContent:"center"
	},
	cameraIcon: {
		color: "#fff",
		alignItems:"center",
		justifyContent:"center",
		width:ROW_HEIGHT * 2,
		height:ROW_HEIGHT * 2,
		borderRadius:100,
		borderWidth: 2
	},
	rightItem: {
		flex: 1,
		zIndex: 0,
		alignItems:"center",
		justifyContent:"center",
		paddingVertical: 5,
		borderWidth: 2,
		borderRadius: 50,
		borderTopLeftRadius: 0,
		borderBottomLeftRadius: 0,
		height: ROW_HEIGHT,
		right: 20
	},
	text: {
		...systemWeights.bold,
		fontSize: ROW_HEIGHT /2,
		textAlign: "center",
		color: "#fff"
	}
});

//ComponentShouldNotUpdate
const CameraRow = memo(
	_CameraRow,
	() => true
);

module.exports = CameraRow;
