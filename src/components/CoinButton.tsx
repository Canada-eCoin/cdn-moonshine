import React, { memo } from "react";
import {
	TouchableOpacity,
	StyleSheet,
	Image,
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import bitcoinUnits from "bitcoin-units";
import { Text, View } from "../styles/components";

// Side-effect import — see the note in App.js. Do not remove.
require("../utils/ecoincore");

const {
	formatNumber,
	normalize
} = require("../utils/helpers");

const {
	getCoinImage,
	getCoinData
} = require("../utils/networks");


interface FormatBalance {
	coin: string,
	cryptoUnit: string,
	balance?: number
}

const formatBalance = ({ coin = "", cryptoUnit = "satoshi", balance = 0 }: FormatBalance): string => {
	try {
		let formattedBalance = "0";
		if (balance === 0 && cryptoUnit === "BTC") {
			formattedBalance = "0";
		} else {
			//This prevents the view from displaying 0 for values less than 50000 BTC
			if (balance < 50000 && cryptoUnit === "BTC") {
				formattedBalance = `${(Number(balance) * 0.00000001).toFixed(8)}`;
			} else {
				formattedBalance = bitcoinUnits(balance, "satoshi").to(cryptoUnit).value();
			}
		}
		formattedBalance = formatNumber(formattedBalance);
		return `${formattedBalance} ${getCoinData({ selectedCrypto: coin, cryptoUnit }).acronym}`;
	} catch (e) {
		return "0";
	}
};

interface CoinButtonComponent {
	onCoinPress: Function,
	cryptoUnit: string,
	coin: string,
	label: string,
	walletId: string,
	balance?: number
}

const isInfinite = (n) => {
  return n === n/0;
}

const _CoinButton = (
	{ onCoinPress, cryptoUnit, coin, walletId, balance, fiatSign,
		selectedCryptoByName, fiatPrice, fiatSymbol, fiatBalance, exchangeRate,
		priceInSatoshi, estValueInSatoshi

	}: CoinButtonComponent) => {
	// let acronym = getCoinData({ selectedCrypto: coin, cryptoUnit }).acronym
	// let exchangeRate = 0;
	// let fiatRate = 0;
	// let fiatSymbol = "";

	// if(eCoinCore.collections && eCoinCore.collections.ExchangeRates){
	// 	exchangeRate = eCoinCore.collections.ExchangeRates.findOne({call: acronym});
	// 	if(exchangeRate) exchangeRate = exchangeRate.rate

	// 	fiatRate = eCoinCore.collections.ExchangeRates.findOne({call: String(selectedCurrency).toUpperCase()})
	// 	if(fiatRate) {
	// 		fiatSymbol = fiatRate.symbol
	// 		fiatRate = fiatRate.rate
	// 	}

	// }

	// let fiatPrice = Number(exchangeRate / fiatRate)
	// let fiatBalance = Number(fiatPrice * (balance/100000000)).toFixed(2);

	if(fiatBalance < .1) { 
		fiatBalance = Number(fiatBalance).toFixed(4);
	} else if(fiatBalance < 1) {
		fiatBalance = Number(fiatBalance).toFixed(3);
	} else fiatBalance = Number(fiatBalance).toFixed(2);


	if(fiatPrice < .1) { 
		fiatPrice = Number(fiatPrice).toFixed(4);
	} else if(fiatPrice < 1) {
		fiatPrice = Number(fiatPrice).toFixed(3);
	} else fiatPrice = Number(fiatPrice).toFixed(2);



	let brandStyle = {
		width: "100%",
		flexDirection: "row",
		backgroundColor: `${getCoinData({selectedCrypto:coin}).color}16`,
		borderColor: `${getCoinData({selectedCrypto:coin}).color}88`,
		borderWidth: 1,
		borderRadius: normalize(6),
		marginBottom: normalize(6),
	}

	return (
		<TouchableOpacity key={`${coin}${walletId}`} onPress={() => onCoinPress({coin, walletId})} style={brandStyle}>
			<View type="card" style={styles.buttonContent}>
				<Image
					style={styles.buttonImage}
					source={getCoinImage(coin)}
				/>
				{exchangeRate && !isInfinite(exchangeRate) && 
					<View type='transparent'>
					<View style={styles.leftHandContainer}>
						<Text type="text" style={styles.title}>{selectedCryptoByName}</Text>

						<Text type="text" style={styles.subText}>{Number(priceInSatoshi).toFixed(8)} BTC</Text>
						<Text type="text" style={styles.subText}>{fiatSymbol}{formatNumber(fiatPrice)} {fiatSign}</Text>
					</View>

					<View style={styles.rightHandContainer}>
						<Text type="text" style={styles.balance}>{balance.toFixed(8)}</Text>
						<Text type="text" style={styles.subBalance}>{Number(estValueInSatoshi).toFixed(8)} BTC</Text>
						<Text type="text" style={styles.subBalance}>{fiatSymbol}{formatNumber(fiatBalance)} {fiatSign}</Text>
					</View>

{/*						
	<Text type="text" style={styles.subText}>coin: {formatNumber(coin)}</Text>
	<Text type="text" style={styles.subText}>label: {formatNumber(label)}</Text>
	<Text type="text" style={styles.subText}>balance: {formatNumber(balance)}</Text>
	<Text type="text" style={styles.subText}>fiatValue: {fiatValue}</Text>
	<Text type="text" style={styles.subText}>fiatInBitcoin: {formatNumber(fiatInBitcoin)}</Text>
	<Text type="text" style={styles.subText}>acronym: {acronym}</Text>
	<Text type="text" style={styles.subText}>priceInSatoshi: {Number(priceInSatoshi).toFixed(8)}</Text>
	<Text type="text" style={styles.subText}>fiatPrice: {formatNumber(fiatPrice)}</Text>
	<Text type="text" style={styles.subText}>fiatBalance: {fiatBalance}</Text>
	<Text type="text" style={styles.subText}>selectedCryptoByName: {selectedCryptoByName}</Text>
	<Text type="text" style={styles.subText}>estValueInFiat: {estValueInFiat}</Text>
	<Text type="text" style={styles.subText}>fiatSymbol: {formatNumber(fiatSymbol)}</Text>
	<Text type="text" style={styles.subText}>exchangeRate: {formatNumber(exchangeRate)}</Text>
	<Text type="text" style={styles.subText}>fiatSign: {formatNumber(fiatSign)}</Text>
	<Text type="text" style={styles.subText}>selectedCrypto: {formatNumber(selectedCrypto)}</Text>
	<Text type="text" style={styles.subText}>selectedCurrency: {formatNumber(selectedCurrency)}</Text>
*/}


					</View>
				||
					<View type='transparent'>
						<Text type="text" style={styles.balanceText}>{getCoinData({selectedCrypto:coin}).label}</Text> 
						<Text type="text" style={styles.text}>{formatBalance({ balance, coin, cryptoUnit })}</Text>
					</View>
				}

			</View>
		</TouchableOpacity>
	);
};

_CoinButton.propTypes = {
	onCoinPress: PropTypes.func.isRequired,
	cryptoUnit: PropTypes.string.isRequired,
	coin: PropTypes.string.isRequired,
	label: PropTypes.string.isRequired,
	walletId: PropTypes.string.isRequired,
	balance: PropTypes.number
};

const styles = StyleSheet.create({
	buttonContent: {
		flex: 1,
		backgroundColor: "transparent",
		padding: normalize(10),
		minHeight: normalize(60)
	},
	buttonImage: {
		width: normalize(20),
		height: normalize(20),
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
    opacity: 0.9,
    top: normalize(34),
    left: normalize(10)


	},
	leftHandContainer: {
		position: "absolute",
		textAlign: "left",
		left: normalize(26)
	},
	rightHandContainer: {
		position: "absolute",
		textAlign: "right",
		right: 0,

	},
	title: {
		...systemWeights.regular,
		marginBottom: normalize(3),
		fontSize: normalize(19),
		marginLeft: normalize(-22)
	},
	balance: {
		...systemWeights.bold,
		fontSize: normalize(16),
		marginBottom: normalize(3),
		marginTop: normalize(2),
		textAlign: "right",
		fontFamily: 'monospace'
	},
	text: {
		...systemWeights.semibold,
		fontSize: normalize(21),
		textAlign: "right"
	},
	subBalance: {
		...systemWeights.regular,
		fontSize: normalize(12),
		textAlign: "right",
		fontFamily: 'monospace'
	},
	subText: {
		...systemWeights.regular,
		fontSize: normalize(12),
		textAlign: "left",
		fontFamily: 'monospace'
	},
	balanceText: {
		...systemWeights.regular,
		fontSize: normalize(16),
		textAlign: "right"
	}
});


//ComponentShouldNotUpdate
const CoinButton = memo(
	_CoinButton,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.label === nextProps.label && prevProps.balance === nextProps.balance;
	}
);

export default CoinButton;
