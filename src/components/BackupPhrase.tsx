import React, {memo} from "react";
import { StyleSheet, Image, Dimensions, PixelRatio, Platform } from "react-native";
import {systemWeights} from "react-native-typography";
import PropTypes from "prop-types";
import { View, TouchableOpacity, Text } from "../styles/components";

const ListItem = ({ id = 0, word = "" } = {}) => {
	return (
		<View type="transparent" style={styles.listItem}>
			<Text type="text" style={styles.text}>{id}. {word}</Text>
		</View>
	);
};

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

interface BackupPhraseComponent {
	onPress: () => null,
	phrase: [{id: number, word: string}]
}
const _BackupPhrase = ({ phrase = [{ id: 0, word: "" }], onPress = () => null }: BackupPhraseComponent) => {
	let p1, p2 = [];
	try {
		const halfway = Math.floor(phrase.length / 2);
		p1 = phrase.slice(0, halfway);
		p2 = phrase.slice(halfway, phrase.length);
	} catch (e) {}

	try {
		return (
			<TouchableOpacity type="background" onPress={onPress} activeOpacity={1}>

				{/*<Text style={styles.header}>Canada eCoin Mobile</Text>*/}
				<Image
					style={styles.icon}
					source={require("../assets/logo/main_icon.png")}
				/>

				{/*<Text style={[styles.text]}>This set of words is your `seed phrase`.  It is the seed that sprouts all of the wallets used within.</Text>*/}
				<Text style={[styles.text]}>It is VERY IMPORTANT that you write these words down by hand!!</Text>
				<Text style={[styles.text]}>Include the date and the app name (cdn-moonshine) aswell, and put them in the safest place you have.</Text>
				<View style={styles.container}>
					

				<View type="transparent" style={[styles.column, { right: "-10%" }]}>
					{p1.map(({ id, word }) => <ListItem key={`${id}${word}`} id={id} word={word} />)}
				</View>
				<View type="transparent" style={[styles.column, { right: "-5%" }]}>
					{p2.map(({ id, word }) => <ListItem key={`${id}${word}`} id={id} word={word} />)}
				</View>
				</View>
			</TouchableOpacity>
		);
	} catch (e) {
		return <View />;
	}
};

_BackupPhrase.propTypes = {
	onPress: PropTypes.func,
	phrase: PropTypes.array.isRequired
};


const styles = StyleSheet.create({
	container: {
		width: "100%",
		flexDirection: "row",
		borderRadius: 0,
		alignSelf: "center",
		marginVertical: 0
	},
	header: {
		...systemWeights.semibold,
		textAlign: "center",
		margin: 20,
		marginTop: 30,
		fontSize: normalize(24)
	},
	icon: {
		alignSelf: "center",
		width: normalize(48),
		height: normalize(48),
		margin: normalize(16),
	},
	listItem: {
		flexDirection: "row"
	},
	text: {
		...systemWeights.semibold,
		fontSize: normalize(14),
		textAlign: "center",
		marginVertical: 4
	},
	column: {
		flex: 1,
		justifyContent: "center",
		alignItems: "flex-start"
	}
});

//ComponentShouldNotUpdate
const BackupPhrase = memo(
	_BackupPhrase,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (nextProps.phrase === prevProps.phrase);
	}
);

export default BackupPhrase;
