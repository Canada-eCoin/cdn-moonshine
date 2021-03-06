import React, {memo} from "react";
import {StyleSheet, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import bitcoinUnits from "bitcoin-units";
import {systemWeights} from "react-native-typography";
import { Text } from "../styles/components";

const { 
	eCoinCore
} = require("../utils/ecoincore");

const {
	formatNumber,
	capitalize
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

	} catch (e) {}

	const _onSelectCoinPress = () => onSelectCoinPress();

	return (
		<TouchableOpacity style={styles.container} activeOpacity={activeOpacity} onPress={_onSelectCoinPress}>
			{walletName !== "" &&
			<Text style={[styles.cryptoValue, { fontSize: fontSize/2 }]}>{walletName}{compress && `: ${getCryptoLabel({selectedCrypto})}`}</Text>}
			{!compress && <Text style={[styles.cryptoValue, { fontSize: fontSize/1.8, ...selectedCryptoStyle }]}>{getCryptoLabel({selectedCrypto})}</Text>}
			
			{bitcoinRate !== NaN && bitcoinRate !== 0 && !isInfinite(exchangeRate) && 
				<View style={styles.row}>
					<View style={{ flexDirection: "row", alignItems: "center", left: -4 }}>
						<Text style={[styles.fiatSymbol, { fontSize: fontSize/2 }]}>{fiatSymbol} </Text>
						<Text style={[styles.fiatValue, { fontSize: fontSize/1.2 }]}>{formatNumber(fiatValue)}</Text>
					</View>
				</View>
			}
				<View style={styles.cryptoValueRow}>
					<Text style={[styles.cryptoValue, { fontSize: fontSize/2.5 }]}>{Number(cryptoValue).toFixed(8)}  {getCryptoUnitLabel({ cryptoUnit, selectedCrypto })}</Text>
				</View>
			{bitcoinRate !== NaN && bitcoinRate !== 0 && !isInfinite(exchangeRate) && 
				<View style={styles.cryptoValueRow}>
					<Text style={[styles.exchangeRate, { fontSize: fontSize/4 }]}>{`1  ${getCoinData({selectedCrypto, cryptoUnit}).crypto} = ${Number( exchangeRate / bitcoinRate ).toFixed(8)} BTC`}</Text>
					<Text style={[styles.exchangeRate, { fontSize: fontSize/4 }]}>{`1  ${getCoinData({selectedCrypto, cryptoUnit}).crypto} = ${fiatSymbol} ${formatNumber(exchangeRate)} ${selectedCurrency}`}</Text>
				</View> 
			}

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
		backgroundColor: "transparent"
	},
	fiatValue: {
		...systemWeights.thin,
		textAlign: "center",
		left: -4,
		backgroundColor: "transparent"
	},
	cryptoValue: {
		...systemWeights.thin,
		textAlign: "center",
		backgroundColor: "transparent"
	},
	exchangeRate: {
		...systemWeights.light,
		textAlign: "center",
		backgroundColor: "transparent"
	}
});

//ComponentShouldNotUpdate
const Header = memo(
	_Header,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return (
			nextProps.exchangeRate === prevProps.exchangeRate &&
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
