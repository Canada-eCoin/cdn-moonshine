import React, {memo} from "react";
import { StyleSheet, TouchableOpacity, View, StatusBar } from "react-native";
import PropTypes from "prop-types";
import bitcoinUnits from "bitcoin-units";
import {systemWeights} from "react-native-typography";
import { Text } from "../styles/components";

const {
	formatNumber
} = require("../utils/helpers");

const {
	getCoinData
} = require("../utils/networks");

const getCryptoLabel = ({ selectedCrypto = "bitcoin" } = {}) => {
	try {
		return getCoinData({ selectedCrypto }).label;
	} catch (e) {
		console.log(e);
	}
};

interface GetCryptoUnitLabel {
	cryptoUnit: string,
	selectedCrypto: string
}
const getCryptoUnitLabel = (
	{ cryptoUnit = "satoshi", selectedCrypto = "bitcoin" }:
		GetCryptoUnitLabel = {
		cryptoUnit: "satoshi", selectedCrypto: "bitcoin"
	}) => {
	try {
		return getCoinData({ cryptoUnit, selectedCrypto }).acronym;
	} catch (e) {
		console.log(e);
	}
};

const isInfinite = (n) => {
  return n === n/0;
}

interface HeaderComponent {
	compress: boolean,
	fiatSymbol: string,
	selectedCrypto: string,
	selectedWallet: string,
	selectedCurrency: string,
	onSelectCoinPress: Function,
	isOnline: boolean,
	exchangeRate: number | string,
	walletName: string,
	selectedCryptoStyle: object,
	activeOpacity: number,
	fontSize: number,
	fiatValue: number,
	cryptoValue: number | string,
	cryptoUnit: string
}
const _Header = ({compress = false, selectedCurrency = "", fiatSymbol = "$", selectedCrypto = "bitcoin", bitcoinRate = 0, onSelectCoinPress = () => null, isOnline = true, exchangeRate = 0, walletName = "", selectedCryptoStyle = {}, activeOpacity = 0.6, fontSize = 60, fiatValue = 0, cryptoValue = 0, cryptoUnit = "satoshi"}: HeaderComponent) => {
	try {
		if (isNaN(fiatValue)) fiatValue = 0;
		if (cryptoValue === 0 && cryptoUnit === "BTC") {
			cryptoValue = 0;
		} else {
			//This prevents the view from displaying 0 for values less than 50000 BTC
			if (cryptoValue < 50000 && cryptoUnit === "BTC") {
				if (typeof cryptoValue !== "number") cryptoValue = Number(cryptoValue);
				cryptoValue = `${(cryptoValue * 0.00000001).toFixed(8)}`;
			} else {
				cryptoValue = bitcoinUnits(cryptoValue, "satoshi").to(cryptoUnit).value();
			}
		}

		if(exchangeRate > 1000 ){
			exchangeRate = Number(exchangeRate).toFixed(0);
		} else if(exchangeRate > 1 ){
			exchangeRate = Number(exchangeRate).toFixed(2);
		} else if(exchangeRate > 0.1 ){
			exchangeRate = Number(exchangeRate).toFixed(3);
		} else {
			exchangeRate = Number(exchangeRate).toFixed(4);
		};


		if(cryptoValue > 100000 ){
			cryptoValue = Number(cryptoValue).toFixed(2);
		} else if(cryptoValue > 10000 ){
			cryptoValue = Number(cryptoValue).toFixed(4);
		} else if(cryptoValue > 100 ){
			cryptoValue = Number(cryptoValue).toFixed(6);
		} else {
			cryptoValue = Number(cryptoValue).toFixed(8);
		};

	} catch (e) {}

	// If we are displaying bitcoin, then the bitcoin price is also the same as bitcoin... This prevents the display messing with rounded-off decimals;
	if(selectedCrypto == "bitcoin") bitcoinRate = 0;

	const _onSelectCoinPress = () => onSelectCoinPress();

	return (
		<TouchableOpacity style={styles.container} activeOpacity={activeOpacity} onPress={_onSelectCoinPress}>
			<StatusBar barStyle="light-content" backgroundColor={getCoinData({selectedCrypto}).color} />
			{walletName !== "" &&
			<Text style={[styles.header, { fontSize: fontSize/2 }]}>{walletName}{compress && `: ${getCryptoLabel({selectedCrypto})}`}</Text>}
			{!compress && <Text style={[styles.cryptoHeader, { fontSize: fontSize/1.8, ...selectedCryptoStyle }]}>{getCryptoLabel({selectedCrypto})}</Text>}
			
			{!isNaN(fiatValue) && fiatValue !== 0 && !isInfinite(fiatValue) && 
				<View style={styles.row}>
					<View style={{ flexDirection: "row", alignItems: "center", left: -4 }}>
						<Text style={[styles.fiatSymbol, { fontSize: fontSize/2 }]}>{fiatSymbol}</Text>
						<Text style={[styles.fiatValue, { fontSize: fontSize/1.2 }]}>{formatNumber(Number(fiatValue).toFixed(2))}</Text>
					</View>
				</View>
			}
				<View style={styles.cryptoValueRow}>
					<Text style={[styles.cryptoValue, { fontSize: fontSize/2.5 }]}>{cryptoValue} {getCryptoUnitLabel({ cryptoUnit, selectedCrypto })}</Text>
				</View>
				<View style={styles.cryptoValueRow}>
					{!isNaN(bitcoinRate) && bitcoinRate !== 0 && !isInfinite(bitcoinRate) && 
						<Text style={[styles.exchangeRate, { fontSize: fontSize/4 }]}>{`1  ${getCoinData({selectedCrypto, cryptoUnit}).crypto} = ${Number( exchangeRate / bitcoinRate ).toFixed(8)} BTC`}</Text>
					}
					{!isNaN(exchangeRate) && exchangeRate !== 0 && !isInfinite(exchangeRate) && 
						<Text style={[styles.exchangeRate, { fontSize: fontSize/4 }]}>{`1  ${getCoinData({selectedCrypto, cryptoUnit}).crypto} = ${fiatSymbol} ${exchangeRate} ${selectedCurrency}`}</Text>
					}
				</View> 

			{isOnline !== true &&
				<Text style={[styles.errorRow, { marginTop: 10, fontSize: fontSize/2.5 }]}>Currently Offline</Text>
			}
		</TouchableOpacity>
	);
};

_Header.propTypes = {
	compress: PropTypes.bool,
	fiatValue: PropTypes.number,
	fiatSymbol: PropTypes.string,
	cryptoValue: PropTypes.number,
	cryptoUnit: PropTypes.string,
	selectedCrypto: PropTypes.string,
	selectedWallet: PropTypes.string,
	onSelectCoinPress: PropTypes.func,
	isOnline: PropTypes.bool,
	exchangeRate: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.number
	]),
	selectedCryptoStyle: PropTypes.object,
	activeOpacity: PropTypes.number,
	fontSize: PropTypes.number
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "transparent"
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	cryptoValueRow: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		marginTop: 5
	},
	errorRow: {
		...systemWeights.light,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		marginTop: 5
	},
	fiatSymbol: {
		...systemWeights.light,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		fontFamily: 'monospace'
	},
	fiatValue: {
		...systemWeights.thin,
		textAlign: "center",
		backgroundColor: "transparent",
		fontFamily: 'monospace'
	},
	cryptoHeader: {
		...systemWeights.thin,
		textAlign: "center",
		backgroundColor: "transparent",
	},
	cryptoValue: {
		...systemWeights.thin,
		textAlign: "center",
		backgroundColor: "transparent",
		fontFamily: 'monospace'
	},
	exchangeRate: {
		...systemWeights.light,
		textAlign: "center",
		backgroundColor: "transparent",
		fontFamily: 'monospace'
	}
});

//ComponentShouldNotUpdate
const Header = memo(
	_Header,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (
			nextProps.fiatValue === prevProps.fiatValue &&
			nextProps.cryptoValue === prevProps.cryptoValue &&
			nextProps.isOnline === prevProps.isOnline &&
			nextProps.selectedWallet === prevProps.selectedWallet &&
			nextProps.selectedCrypto === prevProps.selectedCrypto &&
			nextProps.cryptoUnit === prevProps.cryptoUnit &&
			nextProps.compress === prevProps.compress
		);
	}
);

export default Header;
